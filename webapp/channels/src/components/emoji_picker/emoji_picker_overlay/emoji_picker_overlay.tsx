// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import memoize from 'memoize-one';
import React from 'react';
import type {ComponentProps, ReactNode} from 'react';
import {Overlay} from 'react-bootstrap';

import type {Emoji} from '@mattermost/types/emojis';

import {Constants} from 'utils/constants';
import {popOverOverlayPosition} from 'utils/position_utils';

import EmojiPickerTabs from '../emoji_picker_tabs';

import type {PropsFromRedux} from './index';

export interface Props extends PropsFromRedux {
    target: () => ReactNode;
    onEmojiClick: (emoji: Emoji) => void;
    onGifClick?: (gif: string) => void;
    onAddCustomEmojiClick?: () => void;
    onHide: () => void;
    onExited?: () => void;
    show: boolean;
    placement?: ComponentProps<typeof Overlay>['placement'];
    topOffset?: number;
    rightOffset?: number;
    leftOffset?: number;
    spaceRequiredAbove?: number;
    spaceRequiredBelow?: number;
    enableGifPicker?: boolean;
    defaultHorizontalPosition?: 'left' | 'right';
}

export default class EmojiPickerOverlay extends React.PureComponent<Props> {
    // An emoji picker in the center channel is contained within the post list, so it needs space
    // above for the channel header and below for the post textbox
    static CENTER_SPACE_REQUIRED_ABOVE = 476;
    static CENTER_SPACE_REQUIRED_BELOW = 497;

    // An emoji picker in the RHS isn't constrained by the RHS, so it just needs space to fit
    // the emoji picker itself
    static RHS_SPACE_REQUIRED_ABOVE = 420;
    static RHS_SPACE_REQUIRED_BELOW = 420;

    // Reasonable defaults calculated from the center channel
    static defaultProps = {
        spaceRequiredAbove: EmojiPickerOverlay.CENTER_SPACE_REQUIRED_ABOVE,
        spaceRequiredBelow: EmojiPickerOverlay.CENTER_SPACE_REQUIRED_BELOW,
        enableGifPicker: false,
    };

    emojiPickerPosition = memoize((emojiTrigger, show) => {
        let calculatedRightOffset = Constants.DEFAULT_EMOJI_PICKER_RIGHT_OFFSET;

        if (!show) {
            return calculatedRightOffset;
        }

        if (emojiTrigger) {
            calculatedRightOffset = window.innerWidth - emojiTrigger.getBoundingClientRect().left - Constants.DEFAULT_EMOJI_PICKER_LEFT_OFFSET;

            if (calculatedRightOffset < Constants.DEFAULT_EMOJI_PICKER_RIGHT_OFFSET) {
                calculatedRightOffset = Constants.DEFAULT_EMOJI_PICKER_RIGHT_OFFSET;
            }
        }

        return calculatedRightOffset;
    });

    getPlacement = memoize((target, spaceRequiredAbove, spaceRequiredBelow, defaultHorizontalPosition, show) => {
        if (!show) {
            return 'top' as const;
        }

        if (target) {
            const targetBounds = target.getBoundingClientRect();
            return popOverOverlayPosition(targetBounds, window.innerHeight, spaceRequiredAbove, spaceRequiredBelow, defaultHorizontalPosition);
        }

        return 'top' as const;
    });

    render() {
        const {target, rightOffset, spaceRequiredAbove, spaceRequiredBelow, defaultHorizontalPosition, show, isMobileView} = this.props;
        const calculatedRightOffset = typeof rightOffset === 'undefined' ? this.emojiPickerPosition(target(), show) : rightOffset;
        const placement = this.getPlacement(target(), spaceRequiredAbove, spaceRequiredBelow, defaultHorizontalPosition, show);

        return (
            <Overlay
                show={show}
                placement={this.props.placement ?? placement}
                rootClose={!isMobileView}
                onHide={this.props.onHide}
                target={target}
                animation={false}
                onExited={this.props?.onExited}
            >
                <EmojiPickerTabs
                    enableGifPicker={this.props.enableGifPicker}
                    onEmojiClose={this.props.onHide}
                    onEmojiClick={this.props.onEmojiClick}
                    onGifClick={this.props.onGifClick}
                    rightOffset={calculatedRightOffset}
                    topOffset={this.props.topOffset}
                    leftOffset={this.props.leftOffset}
                    onAddCustomEmojiClick={this.props.onAddCustomEmojiClick}
                />
            </Overlay>
        );
    }
}
