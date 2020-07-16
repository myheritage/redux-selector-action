# Redux Action Selector
[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

Same Redux "selectors" but for actions, inspired by [reselect](https://github.com/reduxjs/reselect).

* Action selectors accept store selectors to eventually inject their derived data to the given action creator.
* Action selectors can be dispatched as any other Redux action.
* Action selectors reduce the data your "containers" (components connected to redux store) need to pass.


An action selector accepts selectors and a regular action creator


```js
import { createActionSelector } from 'redux-action-selector'

const getCsrfToken = state => state.csrfToken
const getOrderId = state => state.orderId
const getCurrency = state => state.currency
const getLang = state => state.lang


export const fetchOrder = createActionSelector(
  getCsrfToken,
  getOrderId,
  getCurrency,
  getLang,
  (token, id, currency, lang) => ({
      type: 'fetch_order_request'
      payload: {
          ...
      }
  })
)

dispatch(fetchOrder());
```

## Table of Contents

- [Installation](#installation)
  - [Motivation for Action Selectors](#motivation-for-sction-selectors)

## Installation
    npm install redux-action-selector


## Motivation for Action Selectors

