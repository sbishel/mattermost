// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/build/pdf.worker.min.mjs';
import type {RenderParameters} from 'pdfjs-dist/types/src/display/api';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {useDispatch} from 'react-redux';

import type {FileInfo} from '@mattermost/types/files';

import {Client4} from 'mattermost-redux/client';
import {getFilePreviewUrl, getFileUrl} from 'mattermost-redux/utils/file_utils';

import {openModal} from 'actions/views/modals';

import FilePreviewModal from 'components/file_preview_modal';
import LoadingSpinner from 'components/widgets/loading/loading_spinner';

import {FileTypes, ModalIdentifiers} from 'utils/constants';
import {getSiteURL} from 'utils/url';
import {getFileType} from 'utils/utils';

import './apps_form_preview.scss';

type Props = {
    fileId: string;

    // Crop height in pixels from the top; unset shows the whole image or first page.
    maxHeight?: number;
    label?: string;
    description?: string;
};

type Status = 'loading' | 'success' | 'fail';

// Renders an image or the first page of a PDF inline, optionally cropped to maxHeight.
// Clicking opens the full file in the standard file preview modal.
const AppsFormPreview: React.FC<Props> = ({fileId, maxHeight, label, description}) => {
    const dispatch = useDispatch();
    const intl = useIntl();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [status, setStatus] = useState<Status>('loading');

    useEffect(() => {
        let cancelled = false;
        setFileInfo(null);
        setStatus('loading');

        Client4.getFileInfo(fileId).then((info) => {
            if (!cancelled) {
                setFileInfo(info);
            }
        }).catch(() => {
            if (!cancelled) {
                setStatus('fail');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [fileId]);

    const fileType = fileInfo ? getFileType(fileInfo.extension) : null;

    useEffect(() => {
        if (!fileInfo) {
            return undefined;
        }

        if (fileType !== FileTypes.PDF) {
            // Images report success from the <img> onLoad handler.
            if (fileType !== FileTypes.IMAGE) {
                setStatus('fail');
            }
            return undefined;
        }

        let cancelled = false;
        let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null;

        const renderFirstPage = async () => {
            try {
                pdf = await pdfjsLib.getDocument({
                    url: getFileUrl(fileInfo.id),
                    cMapUrl: getSiteURL() + '/static/cmaps/',
                    cMapPacked: true,
                }).promise;
                const page = await pdf.getPage(1);
                const canvas = canvasRef.current;
                if (cancelled || !canvas) {
                    return;
                }

                // Render at the canvas's displayed width (times the pixel ratio) so text stays sharp.
                const cssWidth = canvas.parentElement?.clientWidth || page.getViewport({scale: 1}).width;
                const scale = (cssWidth / page.getViewport({scale: 1}).width) * (window.devicePixelRatio || 1);
                const viewport = page.getViewport({scale});
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: canvas.getContext('2d') as object,
                    viewport,
                } as RenderParameters).promise;

                if (!cancelled) {
                    setStatus('success');
                }
            } catch (err) {
                console.log('Unable to render PDF preview: ' + String(err)); //eslint-disable-line no-console
                if (!cancelled) {
                    setStatus('fail');
                }
            }
        };

        renderFirstPage();

        return () => {
            cancelled = true;
            pdf?.destroy();
        };
    }, [fileInfo, fileType]);

    const openFullPreview = useCallback(() => {
        if (!fileInfo) {
            return;
        }
        dispatch(openModal({
            modalId: ModalIdentifiers.FILE_PREVIEW_MODAL,
            dialogType: FilePreviewModal,
            dialogProps: {
                fileInfos: [fileInfo],
                postId: fileInfo.post_id,
                startIndex: 0,
            },
        }));
    }, [dispatch, fileInfo]);

    let content;
    if (status === 'fail') {
        content = (
            <div className='apps-form-preview__error'>
                {fileInfo ? fileInfo.name : intl.formatMessage({id: 'apps_form.preview.unavailable', defaultMessage: 'Preview unavailable'})}
            </div>
        );
    } else {
        content = (
            <>
                {status === 'loading' && (
                    <div className='apps-form-preview__loading'>
                        <LoadingSpinner/>
                    </div>
                )}
                {fileInfo && fileType === FileTypes.PDF && (
                    <canvas
                        ref={canvasRef}
                        className='apps-form-preview__media'
                    />
                )}
                {fileInfo && fileType === FileTypes.IMAGE && (
                    <img
                        className='apps-form-preview__media'
                        src={fileInfo.has_preview_image ? getFilePreviewUrl(fileInfo.id) : getFileUrl(fileInfo.id)}
                        alt={fileInfo.name}
                        onLoad={() => setStatus('success')}
                        onError={() => setStatus('fail')}
                    />
                )}
            </>
        );
    }

    return (
        <div className='form-group'>
            {label && <label className='control-label'>{label}</label>}
            <button
                type='button'
                className='apps-form-preview'
                style={maxHeight ? {maxHeight} : undefined}
                onClick={openFullPreview}
                disabled={!fileInfo || status === 'fail'}
                aria-label={intl.formatMessage(
                    {id: 'apps_form.preview.open', defaultMessage: 'Open {name}'},
                    {name: fileInfo?.name ?? ''},
                )}
                data-testid='apps-form-preview'
            >
                {content}
            </button>
            {description && <div className='help-text'>{description}</div>}
        </div>
    );
};

export default AppsFormPreview;
