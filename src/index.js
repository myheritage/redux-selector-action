
const REDUX_ACTION_SELECTOR = '@@redux_action_selector';
const PLACEHOLDER = `${REDUX_ACTION_SELECTOR}/placeholder`;

export const getPlaceholder = () => PLACEHOLDER;

export function ReduxActionSelectorMiddleware(store) {
	return next => action => {
		const {type, payload, meta} = action;
		
		if (type === REDUX_ACTION_SELECTOR) {
            if (typeof payload !== 'function') {
                throw new Error('');
            }

            const {selectors, args} = meta;
            const state = store.getState();
            const computedSelectors = selectors.map(selector => typeof selector === 'function' ? selector(state) : selector);
            const actionCreator = partial(payload, ...computedSelectors);
            store.dispatch(actionCreator(...args));
		} else {
			next(action);
		}
	}
}


/**
 * Accepts an action creator and selectors which we want to inject as dependencies of the action creator.
 * A dependency can be a selector function, which its output will be passed or any other value.
 * Supports the fullowing formats:
 * 1. createActionSelector(dep1, dep2, ..., actionCreator)
 * 2. createActionSelector([dep1, dep2, ...], actionCreator)
 * Returns a new action creator which we can dispatch with redux store.dispatch.
 * The new action creator can be tested using its new props resultFunc, dependencies.
 * resultFunc = the given action creator function
 * dependencies = the given selectors as an array
 * 
 * We can use a special selector as a dependency, called getPlaceholder, for supporting args of the returned action creator.
 * Each getPlaceholder saves the argument position for another outer argument.
 * Once we dispatch the new action, its args will fill all the placeholders by their position order.
 * 
 * @param  {...function} funcs 
 */
export function createActionSelector(...funcs) {
    const actionCreator = funcs.pop();
    const selectors = Array.isArray(funcs[0]) ? funcs[0] : funcs;

    const actionSelector = (...args) => ({
        type: REDUX_ACTION_SELECTOR,
        payload: actionCreator,
        meta: {
            selectors,
            args,
        },
    });

    actionSelector.resultFunc = actionCreator;
    actionSelector.dependencies = selectors;
    return actionSelector;
}

function partial(func, ...boundArgs) {
    return function(...args) {
        let argIndex = 0;
        const newArgs = boundArgs
            .map(arg => arg === PLACEHOLDER ? args[argIndex++] : arg)
            .concat(args.slice(argIndex));
        func(...newArgs);
    }
}