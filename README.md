# Redux Action Selector
[![npm package][npm-badge]][npm]

Same Redux "selectors" but for actions, inspired by [reselect](https://github.com/reduxjs/reselect).

* Selector Actions can be dispatched as any other Redux action.
* Selector Actions accept store selectors to eventually inject their output to the given action creator.
* Selector Actions reduce the data your "containers" (components connected to redux store) need to pass.

A selector-action creator accepts a list of selectors and a regular action creator

**container/actions.js**

```js
import { createActionSelector, getPlaceholder } from 'redux-selector-action';

const getCsrfToken = state => state.csrfToken;
const getCurrency = state => state.currency;
const getLang = state => state.lang;


export const fetchOrder = createActionSelector(
  getCsrfToken,
  getPlaceholder, // placeholder for order id
  getCurrency,
  getLang,
  (token, orderId, currency, lang) => ({
    type: 'fetch_order_request',
    payload: {
      // ...
    }
  })
);

// fetchOrder(123); first arg fills first placeholder, etc.
```

**container/index.js**

```js
import {fetchOrder} from './actions';

const mapDispatchToProps = dispatch => {
  return {
    fetchOrder: id => {
      dispatch(fetchOrder(id));
    }
  }
}
```

**index.js**

```js
import { applyMiddleware, createStore, compose } from 'redux';
import { reduxSelectorActionMiddleware } from 'redux-selector-action';
import rootReducer from './reducers';                                     
import {fetchOrder} from './container/actions';

const middlewareEnhancer = applyMiddleware(reduxSelectorActionMiddleware);
const composedEnhancers = compose(middlewareEnhancer);
const initialState = undefined;

const store = createStore(rootReducer, initialState, composedEnhancers);

store.dispatch(fetchOrder(123));
```

## Table of Contents

- [Installation](#installation)
- [Motivation for Selector Actions](#motivation-for-selector-actions)
- [API](#api)
  - [`getPlaceholder`](#getplaceholder)
  - [`createActionSelector`](#createactionselectorselectors--selectors-resultfunc)
  - [`reduxSelectorActionMiddleware`](#reduxselectoractionmiddleware)
- [FAQ](#faq)
  - [Can I use this package without Redux?](#q-can-i-use-this-package-without-redux)
  - [Can I use this package without Reselect?](#q-can-i-use-this-package-without-reselect)
  - [My action accepts many args that can't be injected, should I pass many getPlaceholders?](#q-my-action-accepts-many-args-that-cant-be-injected-should-i-pass-many-getplaceholders)
  - [How can I test a selector action?](#q-how-can-i-test-a-selector-action)
- [License](#license)


## Installation
    npm install redux-selector-action


## Motivation for Selector Actions
Containers include in most cases some props, which they get just to pass to actions creators.
In order to avoid redundant data (props) passed to those containers, there should be a way for actions to get their data from store.
This way would let us create actions which accept only the data the container holds.
    
Check out the following action creator:

> It seems that every update of any order field will require me to pass `token` and `orderId`, which are redundant from the container's perspective.
```js
export function updateOrderCurrencyAction(token, orderId, currency) {
  return {
    type: 'update_order_currency',
    payload: {
      // ...
    }
  };
}
```
Let's fix this.


## API

### createActionSelector(...selectors | [...selectors], resultFunc)

This function accept a list of selectors, or an array of selectors, computes their output against the store's state, and inject them as arguments to the given `resultFunc`.

[`getPlaceholder`](#getplaceholder) selector will be handled separately.

```js
import { createActionSelector, getPlaceholder } from 'redux-selector-action';
import {updateOrderCurrencyAction} from './actions';

const getCsrfToken = state => state.csrfToken;
const getOrderId = state => state.orderId;

// We accept array of selectors too! choose your preferred way.
export const updateOrderCurrency = createActionSelector(
  [getCsrfToken, getOrderId, getPlaceholder /* currency */],
  updateOrderCurrencyAction,
);

// Now you can pass only the relevant data
updateOrderCurrency('USD');
```

### getPlaceholder()
This is a built-in selector, which you can use as part of your action creator's selectors.
Once you pass it as a dependency, instead of injecting the output of this selector, 
we save its position in the dependency list (selectors) for an arg, which will be sent once you call the action selector.

In case you have an action creator with an "options" argument (meaning an object which maps arg names to their values),
you can use the following syntax:

```js
import { createActionSelector, getPlaceholder } from 'redux-selector-action';
import { getCsrfToken, getCurrency, getLang } from './selectors';

export const fetchOrder = createActionSelector(
  // Map the arg names to selectors, then your action creator will get their values:
  getPlaceholder({
    token: getCsrfToken, 
    currency: getCurrency, 
    lang: getLang,
  }),
  ({token, orderId, currency, lang}) => ({
    type: 'fetch_order_request',
    payload: {
      // ...
    }
  })
);

// fetchOrder({orderId: 123});
```

### reduxSelectorActionMiddleware()
This is a redux middleware which handles our build-in selector actions.
In order to make everything work, you should add it to your store enhancers, the position does not matter.

```js
import { applyMiddleware, createStore, compose } from 'redux';
import { reduxSelectorActionMiddleware } from 'redux-selector-action';
import rootReducer from './reducers';

const middlewareEnhancer = applyMiddleware(reduxSelectorActionMiddleware);
const composedEnhancers = compose(middlewareEnhancer);
const initialState = undefined;

const store = createStore(rootReducer, initialState, composedEnhancers);
```

## FAQ

### Q: Can I use this package without Redux?

A: No. Even though this package has no dependency on Redux, it was designed to be used with Redux.
It means we expect for example that our middleware will be called with Redux store api (store.getState(), store.dispatch()). 


### Q: Can I use this package without Reselect?

A: Yes. This package has no dependency on Reselect, you can work with any selectors you want, eventually they are just functions that accept state.


### Q: My action accepts many args that can't be injected, should I pass many getPlaceholders?

A: Not necessarily. All args you pass to the created action selector will be injected to the placeholders.
But if you pass more args than placeholders, then they will be appended too.


### Q: How can I test a selector action?

Every action selector keeps a reference to the given selectors and the action creator, as `.dependencies` and `.resultFunc` respectively.

For example if you have the following action selector:

**src/actionSelectors.js**
```js
export const getFirst = state => 1;
export const getSecond = state => 2;

export const myActionSelector = createActionSelector(
  getFirst,
  getSecond,
  getPlaceholder,
  (first, second, third) => ({ type: '', payload: { /* ... */ }})
)
```

You can test it this way:

**test/actionSelectors.js**

```js
// test the selectors themselves...
test("getFirst", () => { /* ... */ });
test("getSecond", () => { /* ... */ });

test("myActionSelector", () => {
  // check the dependencies are as expected
  assert(myActionSelector.dependencies).toEqual([getFirst, getSecond, getPlaceholder]);
  // check the resultFunc output is as expected
  assert(myActionSelector.resultFunc(1, 2, 3)).toMatchSnapshot();
})
```


## License

[MIT](./LICENSE)

[npm-badge]: https://img.shields.io/npm/v/redux-selector-action.svg?style=flat-square
[npm]: https://www.npmjs.org/package/redux-selector-action


