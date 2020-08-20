import {createSelectorAction, getPlaceholder, reduxSelectorActionMiddleware} from '../src';

describe('redux selector action', () => {
    describe('getPlaceholder', () => {
        it('should return placeholder object', () => {
            expect(typeof getPlaceholder()).toBe('object');
        });

        it('should match placeholder object empty', () => {
            expect(getPlaceholder()).toMatchSnapshot();
        });

        it('should throw error for invalid selectorObj', () => {
            expect(() => getPlaceholder('wrong type')).toThrowErrorMatchingSnapshot();
        });

        it('should throw error for nullable selectorObj', () => {
            expect(() => getPlaceholder(null)).toThrowErrorMatchingSnapshot();
        });

        it('should match placeholder object with selector object', () => {
            expect(getPlaceholder({dep: () => 'myDep'})).toMatchSnapshot();
        });
    });

    describe('createSelectorAction', () => {
        it('should throw error for invalid resultFunc', () => {
            expect(createSelectorAction).toThrowErrorMatchingSnapshot();
        });

        it('should return selector actions without dependencies', () => {
            const selectorAction = createSelectorAction(jest.fn());
            expect(selectorAction.resultFunc).toBeDefined();
            expect(selectorAction.dependencies).toHaveLength(0);
            expect(selectorAction('myArg')).toMatchSnapshot();
        });

        it('should return selector action with dependencies as args', () => {
            const selectorAction = createSelectorAction(() => 'myDep1', () => 'myDep2', jest.fn());
            expect(selectorAction.resultFunc).toBeDefined();
            expect(selectorAction.dependencies).toHaveLength(2);
            expect(selectorAction('myArg')).toMatchSnapshot();
        });

        it('should return selector action with array of dependencies', () => {
            const selectorAction = createSelectorAction([
                () => 'myDep1',
                () => 'myDep2',
            ], jest.fn());
            expect(selectorAction.resultFunc).toBeDefined();
            expect(selectorAction.dependencies).toHaveLength(2);
            expect(selectorAction('myArg')).toMatchSnapshot();
        });
    });

    describe('reduxSelectorActionMiddleware', () => {
        let actionCreator, dispatch, getState, handleAction, next, selectorAction;

        beforeEach(() => {
            dispatch = jest.fn();
            getState = jest.fn();
            next = jest.fn();
            handleAction = reduxSelectorActionMiddleware({getState, dispatch})(next);
            actionCreator = jest.fn((...args) => ({
                type: 'dummy_action',
                args,
            }));
            selectorAction = {
                type: '@@redux_selector_action',
                payload: actionCreator,
                meta: {
                    selectors: [],
                    args: [],
                },
            };
        });

        it('should call next for unknown action', () => {
            selectorAction.type = 'unknown';
            const nextReturnValue = true;
            next.mockReturnValue(nextReturnValue);
            const result = handleAction(selectorAction);
            expect(next).toHaveBeenCalledWith(selectorAction);
            expect(result).toBe(nextReturnValue);
        });

        it('should throw error for invalid payload type', () => {
            selectorAction.payload = undefined;
            expect(() => handleAction(selectorAction)).toThrowErrorMatchingSnapshot();
            expect(actionCreator).not.toHaveBeenCalled();
            expect(dispatch).not.toHaveBeenCalled();
        });

        it('should dispatch selector action without selectors and args', () => {
            handleAction(selectorAction);
            expect(actionCreator).toHaveBeenCalled();
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls[0]).toHaveLength(0);
        });

        it('should inject selectors output and non-function values to the given action creator', () => {
            selectorAction.meta.selectors.push(
                () => 'dep1',
                'constant',
                getPlaceholder,
            );
            handleAction(selectorAction);
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls).toMatchSnapshot();
        });

        it('should inject args to placeholders by position order', () => {
            selectorAction.meta.selectors.push(
                () => 'dep1',
                getPlaceholder,
                'const1',
                () => 'dep2',
                getPlaceholder(),
                () => 'dep3',
                'const2',
            );
            selectorAction.meta.args.push('arg1', 'arg2', 'arg3', 'arg4');
            handleAction(selectorAction);
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls).toMatchSnapshot();
        });

        it('should inject object to placeholders by position order', () => {
            selectorAction.meta.selectors.push(
                () => 'dep1',
                getPlaceholder({prop1: () => 'prop1Value'}),
                'const1',
                () => 'dep2',
                getPlaceholder({otherProp1: () => 'otherProp1Value'}),
                () => 'dep3',
                'const2',
            );
            selectorAction.meta.args.push(
                {prop3: 'myProp3Value', prop2: 'myProp2Value'},
                {otherProp3: 'myOtherProp3Value', otherProp2: 'myOtherProp2Value'},
                'arg3',
                'arg4',
            );
            handleAction(selectorAction);
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls).toMatchSnapshot();
        });
    });
});