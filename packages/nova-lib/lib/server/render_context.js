import { createMemoryHistory } from 'react-router';
import { compose } from 'redux';
import cookieParser from 'cookie-parser';

import { Meteor } from 'meteor/meteor';
import { DDP } from 'meteor/ddp';
import { Accounts } from 'meteor/accounts-base';
import { RoutePolicy } from 'meteor/routepolicy';
import { WebApp } from 'meteor/webapp';

import {
  createApolloClient,
  configureStore, STORE_RELOADED, getActions, getReducers, getMiddlewares,
  Utils,
} from '../modules/index.js';

import { webAppConnectHandlersUse, bindEnvironment } from './meteor_patch.js';

const Fiber = Npm.require('fibers');

// check the req url
function isAppUrl(req) {
  const url = req.url;
  if (url === '/favicon.ico' || url === '/robots.txt') {
    return false;
  }

  if (url === '/app.manifest') {
    return false;
  }

  // Avoid serving app HTML for declared routes such as /sockjs/.
  if (RoutePolicy.classify(url)) {
    return false;
  }

  // we only need to support HTML pages only
  // this is a check to do it
  return /html/.test(req.headers.accept);
}

// for meteor.user
const LoginContext = function LoginContext(loginToken) {
  this._loginToken = loginToken;

  // get the user
  if (Meteor.users) {
    // check to make sure, we've the loginToken,
    // otherwise a random user will fetched from the db
    let user;
    if (loginToken) {
      const hashedToken = loginToken && Accounts._hashLoginToken(loginToken);
      const query = { 'services.resume.loginTokens.hashedToken': hashedToken };
      const options = { fields: { _id: 1 } };
      user = Meteor.users.findOne(query, options);
    }

    if (user) {
      this.userId = user._id;
    }
  }
};

// for req.cookies
webAppConnectHandlersUse(cookieParser(), { order: 10, name: 'cookieParserMiddleware' });

// initRenderContextMiddleware
webAppConnectHandlersUse(bindEnvironment(function initRenderContextMiddleware(req, res, next) {
  // check the req url
  if (!isAppUrl(req)) {
    next();
    return;
  }

  // init
  const history = createMemoryHistory(req.url);
  const loginToken = req.cookies && req.cookies.meteor_login_token;
  const apolloClient = createApolloClient({ loginToken: loginToken });
  let actions = {};
  let reducers = { apollo: apolloClient.reducer() };
  let middlewares = [Utils.defineName(apolloClient.middleware(), 'apolloClientMiddleware')];

  // renderContext object
  req.renderContext = {
    history,
    loginToken,
    apolloClient,
    addAction(addedAction) { // context.addAction: add action to renderContext
      actions = { ...actions, ...addedAction };
      return this.getActions();
    },
    getActions() { // SSR actions = server actions + renderContext actions
      return { ...getActions(), ...actions };
    },
    addReducer(addedReducer) { // context.addReducer: add reducer to renderContext
      reducers = { ...reducers, ...addedReducer };
      return this.getReducers();
    },
    getReducers() { // SSR reducers = server reducers + renderContext reducers
      return { ...getReducers(), ...reducers };
    },
    addMiddleware(middlewareOrMiddlewareArray) { // context.addMiddleware: add middleware to renderContext
      const addedMiddleware = Array.isArray(middlewareOrMiddlewareArray) ? middlewareOrMiddlewareArray : [middlewareOrMiddlewareArray];
      middlewares = [...middlewares, ...addedMiddleware];
      return this.getMiddlewares();
    },
    getMiddlewares() { // SSR middlewares = server middlewares + renderContext middlewares
      return [...getMiddlewares(), ...middlewares];
    },
  };

  // create store and it will reload
  req.renderContext.store = configureStore(req.renderContext.getReducers, {}, (store) => {
    let chain;
    return next => (action) => { // eslint-disable-line no-shadow
      if (!chain || action.type === STORE_RELOADED) {
        chain = req.renderContext.getMiddlewares().map(middleware => middleware(store));
      }
      return compose(...chain)(next)(action);
    };
  }).reload();

  // for meteor.user
  req.loginContext = new LoginContext(loginToken);

  next();
}), { order: 20 });

// render context object
export const renderContext = new Meteor.EnvironmentVariable();

// render context get function
export const getRenderContext = () => renderContext.get();

// withRenderContextEnvironment
export const withRenderContextEnvironment = (fn, options = {}) => {
  // set newfn
  const newfn = (req, res, next) => {
    if (!isAppUrl(req)) {
      next();
      return;
    }

    Fiber.current._meteor_dynamics = Fiber.current._meteor_dynamics || [];
    Fiber.current._meteor_dynamics[DDP._CurrentInvocation.slot] = req.loginContext;
    Fiber.current._meteor_dynamics[renderContext.slot] = req.renderContext;

    fn(req.renderContext, req, res, next);

    if (options.autoNext) {
      next();
    }
  };

  // get evfn
  const evfn = bindEnvironment(newfn);

  // use it
  WebApp.connectHandlers.use(evfn);

  // get handle
  const handle = WebApp.connectHandlers.stack[WebApp.connectHandlers.stack.length - 1].handle;

  // copy options to handle
  Object.keys(options).forEach((key) => {
    handle[key] = options[key];
  });

  // copy raw fn
  handle.fn = options.fn || fn;

  // rename
  const name = options.name || (options.fn && options.fn.name) || fn.name;
  Utils.defineName(handle, name || '__withRenderContextEnvironment_evfn__');
};

// withRenderContext make it easy to access context
export const withRenderContext = (func, options = {}) => {
  withRenderContextEnvironment(func, { ...options, autoNext: true });
};
