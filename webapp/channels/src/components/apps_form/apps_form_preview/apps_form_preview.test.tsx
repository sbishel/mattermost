// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import React from 'react';

import {Client4} from 'mattermost-redux/client';
import {getFilePreviewUrl, getFileUrl} from 'mattermost-redux/utils/file_utils';

import FilePreviewModal from 'components/file_preview_modal';

import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';

import AppsFormPreview from './apps_form_preview';

// All pdfjs-dist/* imports map to the same mock via moduleNameMapper.
const mockGetDocument = pdfjsLib.getDocument as jest.Mock;

const mockOpenModal = jest.fn();

jest.mock('actions/views/modals', () => ({
    openModal: (...args: unknown[]) => mockOpenModal(...args),
}));

describe('AppsFormPreview', () => {
    const fileId = 'file_info_id';
    let getPage: jest.Mock;

    beforeEach(() => {
        mockOpenModal.mockReset();
        mockOpenModal.mockReturnValue({type: 'MOCK_OPEN_MODAL'});

        getPage = jest.fn(() => Promise.resolve({
            getViewport: () => ({width: 100, height: 100}),
            render: () => ({promise: Promise.resolve()}),
        }));
        mockGetDocument.mockReset();
        mockGetDocument.mockReturnValue({
            promise: Promise.resolve({getPage, destroy: jest.fn()}),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders an image using the preview URL when the file has a preview image', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, name: 'photo.png', extension: 'png', has_preview_image: true});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        const img = await screen.findByRole('img', {name: 'photo.png'});
        expect(img).toHaveAttribute('src', getFilePreviewUrl(fileId));
        expect(Client4.getFileInfo).toHaveBeenCalledWith(fileId);
    });

    it('renders an image using the file URL when there is no preview image', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, name: 'photo.png', extension: 'png', has_preview_image: false});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        const img = await screen.findByRole('img', {name: 'photo.png'});
        expect(img).toHaveAttribute('src', getFileUrl(fileId));
    });

    it('crops to maxHeight when set', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, extension: 'png'});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(
            <AppsFormPreview
                fileId={fileId}
                maxHeight={300}
            />,
        );

        await screen.findByRole('img');
        expect(screen.getByTestId('apps-form-preview')).toHaveStyle({maxHeight: '300px'});
    });

    it('does not crop when maxHeight is unset', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, extension: 'png'});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        await screen.findByRole('img');
        expect(screen.getByTestId('apps-form-preview').style.maxHeight).toBe('');
    });

    it('renders label and description', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, extension: 'png'});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(
            <AppsFormPreview
                fileId={fileId}
                label='My label'
                description='My description'
            />,
        );

        expect(screen.getByText('My label')).toBeVisible();
        expect(screen.getByText('My description')).toBeVisible();
        await screen.findByRole('img');
    });

    it('renders a canvas and loads the first page for a PDF', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, name: 'doc.pdf', extension: 'pdf'});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        const {container} = renderWithContext(<AppsFormPreview fileId={fileId}/>);

        await waitFor(() => {
            expect(container.querySelector('canvas')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(getPage).toHaveBeenCalledWith(1);
        });
        expect(mockGetDocument).toHaveBeenCalledWith(expect.objectContaining({url: getFileUrl(fileId)}));
    });

    it('shows "Preview unavailable" and disables the button when fetching file info fails', async () => {
        jest.spyOn(Client4, 'getFileInfo').mockRejectedValue(new Error('not found'));

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        expect(await screen.findByText('Preview unavailable')).toBeVisible();
        expect(screen.getByTestId('apps-form-preview')).toBeDisabled();
    });

    it('shows the file name and disables the button for unsupported file types', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, name: 'report.docx', extension: 'docx'});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        expect(await screen.findByText('report.docx')).toBeVisible();
        expect(screen.getByTestId('apps-form-preview')).toBeDisabled();
    });

    it('disables the button while the file info is loading', () => {
        jest.spyOn(Client4, 'getFileInfo').mockReturnValue(new Promise(() => {}));

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        expect(screen.getByTestId('apps-form-preview')).toBeDisabled();
    });

    it('opens the file preview modal with the file info when clicked after loading', async () => {
        const info = TestHelper.getFileInfoMock({id: fileId, name: 'photo.png', extension: 'png', post_id: 'post_1'});
        jest.spyOn(Client4, 'getFileInfo').mockResolvedValue(info);

        renderWithContext(<AppsFormPreview fileId={fileId}/>);

        await screen.findByRole('img', {name: 'photo.png'});
        const button = screen.getByTestId('apps-form-preview');
        await waitFor(() => expect(button).toBeEnabled());

        await userEvent.click(button);

        expect(mockOpenModal).toHaveBeenCalledTimes(1);
        expect(mockOpenModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.FILE_PREVIEW_MODAL,
            dialogType: FilePreviewModal,
            dialogProps: {
                fileInfos: [info],
                postId: 'post_1',
                startIndex: 0,
            },
        });
    });
});
