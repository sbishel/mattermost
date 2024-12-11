// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow, mount} from 'enzyme';
import React from 'react';
import {Provider} from 'react-redux';

import mockStore from 'tests/test_store';

import type {Team, TeamMembership} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';

import {TestHelper} from 'utils/test_helper';

import SystemUsers from './';
import { isDisabled } from '@testing-library/user-event/dist/utils';

describe('admin_console/system_users', () => {
    const state = {
        entities: {
            general: {
                config: {
                    SiteName: 'SitenameHello',
                },
            },
        },
    };

    const store = mockStore(state);
    const baseProps = {
        isDisabled: false,
    };

    test('should match snapshot and fields enabled', () => {
        const wrapper = mount(
            <Provider store={store}>
                <SystemUsers {...baseProps}/>
            </Provider>,
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('should match snapshot and fields disabled', () => {
        const props = {...baseProps, isDisabled: true};
        const wrapper = mount(
            <Provider store={store}>
                <SystemUsers {...props}/>
            </Provider>,
        );
        expect(wrapper).toMatchSnapshot();
    });
    // test('should match snapshot loading no users', () => {
    //     const wrapper = shallow(
    //         <SystemUsers
    //             {...baseProps}
    //             // users={[]}
    //             // teamMembers={{}}
    //             // totalCount={0}
    //             // loading={true}
    //         />,
    //     );
    //     expect(wrapper).toMatchSnapshot();
    // });
});
