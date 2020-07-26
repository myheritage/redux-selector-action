import {createActionSelector, getPlaceholder, reduxActionSelectorMiddleware} from '../src';

describe('redux action selector', () => {
    describe('getPlaceholder', () => {
        it('should match placeholder snp', () => {
            expect(getPlaceholder()).toMatchSnapshot();
        })
    });

    describe('createActionSelector', () => {
        it('should throw error for invalid resultFunc', () => {
            expect(createActionSelector).toThrowErrorMatchingSnapshot();
        });

        it('should return action selectors without dependencies', () => {
            const actionSelector = createActionSelector(jest.fn());
            expect(actionSelector.resultFunc).toBeDefined();
            expect(actionSelector.dependencies).toHaveLength(0);
            expect(actionSelector('myArg')).toMatchSnapshot();
        });

        it('should return action selector with dependencies as args', () => {
            const actionSelector = createActionSelector(() => 'myDep1', () => 'myDep2', jest.fn());
            expect(actionSelector.resultFunc).toBeDefined();
            expect(actionSelector.dependencies).toHaveLength(2);
            expect(actionSelector('myArg')).toMatchSnapshot();
        });

        it('should return action selector with array of dependencies', () => {
            const actionSelector = createActionSelector([
                () => 'myDep1',
                () => 'myDep2',
            ], jest.fn());
            expect(actionSelector.resultFunc).toBeDefined();
            expect(actionSelector.dependencies).toHaveLength(2);
            expect(actionSelector('myArg')).toMatchSnapshot();
        });
    });

    describe('reduxActionSelectorMiddleware', () => {
        let actionCreator, actionSelector, dispatch, getState, handleAction, next;

        beforeEach(() => {
            dispatch = jest.fn();
            getState = jest.fn();
            next = jest.fn();
            handleAction = reduxActionSelectorMiddleware({dispatch,
                getState})(next);
            actionCreator = jest.fn((...args) => ({
                type: 'dummy_action',
                args,
            }));
            actionSelector = {
                type: '@@redux_action_selector',
                payload: actionCreator,
                meta: {
                    selectors: [],
                    args: [],
                },
            };
        });

        it('should call next for unknown action', () => {
            actionSelector.type = 'unknown';
            const nextReturnValue = true;
            next.mockReturnValue(nextReturnValue);
            const result = handleAction(actionSelector);
            expect(next).toHaveBeenCalledWith(actionSelector);
            expect(result).toBe(nextReturnValue);
        });

        it('should throw error for invalid payload type', () => {
            actionSelector.payload = undefined;
            expect(() => handleAction(actionSelector)).toThrowErrorMatchingSnapshot();
            expect(actionCreator).not.toHaveBeenCalled();
            expect(dispatch).not.toHaveBeenCalled();
        });

        it('should dispatch action selector without selectors and args', () => {
            handleAction(actionSelector);
            expect(actionCreator).toHaveBeenCalled();
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls[0]).toHaveLength(0);
        });

        it('should inject selectors output and non-function values to the given action creator', () => {
            actionSelector.meta.selectors.push(
                () => 'dep1',
                'constant',
                getPlaceholder,
            );
            handleAction(actionSelector);
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls).toMatchSnapshot();
        });

        it('should inject args to placeholders by position order', () => {
            actionSelector.meta.selectors.push(
                () => 'dep1',
                getPlaceholder,
                'const1',
                () => 'dep2',
                getPlaceholder,
                () => 'dep3',
                'const2',
            );
            actionSelector.meta.args.push('arg1', 'arg2', 'arg3', 'arg4');
            handleAction(actionSelector);
            expect(dispatch).toHaveBeenCalled();
            expect(actionCreator.mock.calls).toMatchSnapshot();
        });
    });
});