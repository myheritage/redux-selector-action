# Redux Action Selector
[![npm package][npm-badge]][npm]

Same Redux "selectors" but for actions, inspired by [reselect](https://github.com/reduxjs/reselect).

* Action selectors can be dispatched as any other Redux action.
* Action selectors accept store selectors to eventually inject their output to the given action creator.
* Action selectors reduce the data your "containers" (components connected to redux store) need to pass.

An action selector accepts a list of selectors and a regular action creator

**container/actions.js**

```js
import { createActionSelector, getPlaceholder } from 'redux-action-selector';

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

## Table of Contents

- [Installation](#installation)
- [Motivation for Action Selectors](#motivation-for-action-selectors)
- [API](#api)
  - [`getPlaceholder`](#getplaceholder)
  - [`createActionSelector`](#createactionselectorselectors--selectors-resultfunc)
- [FAQ](#faq)
  - [Can I use this package without Reselect and Redux?](#q-can-i-use-this-package-without-reselect-and-redux)
  - [My action accepts many args that can't be injected, should I pass many getPlaceholders?](#q-my-action-accepts-many-args-that-cant-be-injected-should-i-pass-many-getplaceholders)
  - [My action accepts an options object which its props can be injected, how can I inject them?](#q-my-action-accepts-an-options-object-which-its-props-can-be-injected-how-can-i-inject-them)
  - [How can I test an action selector?](#q-how-can-i-test-an-action-selector)
- [License](#license)


## Installation
    npm install redux-action-selector


## Motivation for Action Selectors
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

### getPlaceholder()
This is a built-in selector, which you can use as part of your action creator's selectors.
Once you pass it as a dependency, instead of injecting the output of this selector, 
we save its position in the dependency list (selectors) for an arg, which will be sent once you call the action selector.


### createActionSelector(...selectors | [...selectors], resultFunc)

This function accept a list of selectors, or an array of selectors, computes their output against the store's state, and inject them as arguments to the given `resultFunc`.

[`getPlaceholder`](#getplaceholder) selector will be handled separately.

```js
import { createActionSelector, getPlaceholder } from 'redux-action-selector';
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

## FAQ

### Q: Can I use this package without Reselect and Redux?

A: Yes. This package has no dependencies on any other package, even though it was designed to be used with Reselect and Redux.


### Q: My action accepts many args that can't be injected, should I pass many getPlaceholders?

A: Not necessarily. All args you pass to the created action selector will be injected to the placeholders.
But if you pass more args than placeholders, then they will be appended too.


### Q: My action accepts an options object which its props can be injected, how can I inject them?

A: We are working to support also objects (options argument), it will be available soon.
At the meantime, you can extract them to be regular args if you wish to.


### Q: How can I test an action selector?

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
  // check the the resultFunc output as expected
  assert(myActionSelector.resultFunc(1, 2, 3)).toMatchSnapshot();

})
```


## License

MIT

[npm-badge]: https://img.shields.io/npm/v/redux-action-selector.svg?style=flat-square
[npm]: https://www.npmjs.org/package/redux-action-selector


