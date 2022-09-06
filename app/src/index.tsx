import domready from 'domready';
import React, { Suspense } from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import isElectron from 'is-electron';
import { createIntl } from 'react-intl';
import { IntlProvider } from 'react-intl-redux';
import { Route, HashRouter, BrowserRouter, Switch } from 'react-router-dom';
import Logger from './features/Logger';
import debug from 'debug';
import { RoomClient } from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import UnsupportedBrowser from './components/UnsupportedBrowser';
import ConfigDocumentation from './components/ConfigDocumentation';
import ConfigError from './components/ConfigError';
import JoinDialog from './components/JoinDialog';
import LoginDialog from './components/AccessControl/LoginDialog';
import { LoadingView } from './components/Loader/LoadingView';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store/store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';
import { LazyPreload } from './components/Loader/LazyPreload';
import { detectDevice } from 'mediasoup-client';
import { recorder } from './features/BrowserRecorder';
import { config, configError } from './config';
import { meActions } from './store/slices/me';
import { generateRandomString } from './utils';

import './index.css';

const App = LazyPreload(
  () => import(/* webpackChunkName: "app" */ './components/App')
);

// const cache = createIntlCache();

const supportedBrowsers = {
  windows: {
    'internet explorer': '>12',
    'microsoft edge': '>18',
  },
  safari: '>12',
  firefox: '>=60',
  chrome: '>=74',
  chromium: '>=74',
  opera: '>=62',
  'samsung internet for android': '>=11.1.1.52',
  electron: '>=18.1.0',
};

const intl = createIntl({ locale: 'en', defaultLocale: 'en' });

recorder.intl = intl;

if (process.env.NODE_ENV !== 'production') {
  debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

// TODO
const theme = createTheme(config.theme as any);

let Router: any;

if (isElectron()) {
  Router = HashRouter;
} else {
  Router = BrowserRouter;
}

domready(() => {
  logger.debug('DOM ready');

  run();
});

function run() {
  logger.debug('run() [environment:%s]', process.env.NODE_ENV);

  const urlParser = new URL(window.location.href);
  const parameters = urlParser.searchParams;

  const accessCode = parameters.get('code');
  const produce = parameters.get('produce') !== 'false';
  const forceTcp = parameters.get('forceTcp') === 'true';
  const displayName = parameters.get('displayName');
  const avatarUrl = parameters.get('avatarUrl');
  const from = parameters.get('from');
  const muted = parameters.get('muted') === 'true';
  const headless = parameters.get('headless');
  const showConfigDocumentationPath = parameters.get('config') === 'true';

  // Get current device.
  const device = deviceInfo();

  let unsupportedBrowser = false;

  let webrtcUnavailable = false;

  if (detectDevice() === undefined) {
    logger.error('Your browser is not supported [deviceInfo:"%o"]', device);

    unsupportedBrowser = true;
  } else if (
    navigator.mediaDevices === undefined ||
    navigator.mediaDevices.getUserMedia === undefined ||
    window.RTCPeerConnection === undefined
  ) {
    logger.error('Your browser is not supported [deviceInfo:"%o"]', device);

    webrtcUnavailable = true;
  } else if (
    !device.bowser.satisfies(config.supportedBrowsers || supportedBrowsers)
  ) {
    logger.error('Your browser is not supported [deviceInfo:"%o"]', device);

    unsupportedBrowser = true;
  } else {
    logger.debug('Your browser is supported [deviceInfo:"%o"]', device);
  }

  if (unsupportedBrowser || webrtcUnavailable) {
    render(
      <Provider store={store}>
        <MuiThemeProvider theme={theme}>
          <IntlProvider locale={intl.locale}>
            <UnsupportedBrowser
              webrtcUnavailable={webrtcUnavailable}
              platform={device.platform}
            />
          </IntlProvider>
        </MuiThemeProvider>
      </Provider>,
      document.getElementById('tailchat-meeting')
    );

    return;
  }

  if (showConfigDocumentationPath) {
    render(
      <Provider store={store}>
        <MuiThemeProvider theme={theme}>
          <IntlProvider locale={intl.locale}>
            <ConfigDocumentation />
          </IntlProvider>
        </MuiThemeProvider>
      </Provider>,
      document.getElementById('tailchat-meeting')
    );

    return;
  }

  if (configError) {
    render(
      <Provider store={store}>
        <MuiThemeProvider theme={theme}>
          <IntlProvider locale={intl.locale}>
            <ConfigError configError={configError} />
          </IntlProvider>
        </MuiThemeProvider>
      </Provider>,
      document.getElementById('tailchat-meeting')
    );

    return;
  }

  // 生成随机的唯一标识
  const peerId = generateRandomString(8).toLowerCase();
  store.dispatch(
    meActions.setMe({
      peerId,
      loginEnabled: config.loginEnabled,
    })
  );

  if (avatarUrl) {
    store.dispatch(meActions.setPicture(avatarUrl));
  }
  if (from) {
    store.dispatch(meActions.setFrom(from));
  }

  const roomClient = new RoomClient({
    peerId,
    accessCode,
    device,
    produce,
    headless,
    forceTcp,
    displayName,
    muted,
  });

  // @ts-ignore
  global.CLIENT = roomClient;

  render(
    <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <IntlProvider locale={intl.locale}>
          <PersistGate loading={<LoadingView />} persistor={persistor}>
            <RoomContext.Provider value={roomClient}>
              <SnackbarProvider>
                <Router basename={'/'}>
                  <Suspense fallback={<LoadingView />}>
                    <React.Fragment>
                      <Switch>
                        <Route exact path="/" component={JoinDialog} />
                        <Route
                          exact
                          path="/login_dialog"
                          component={LoginDialog}
                        />
                        <Route path="/room/:id" component={App} />
                      </Switch>
                    </React.Fragment>
                  </Suspense>
                </Router>
              </SnackbarProvider>
            </RoomContext.Provider>
          </PersistGate>
        </IntlProvider>
      </MuiThemeProvider>
    </Provider>,
    document.getElementById('tailchat-meeting')
  );
}

serviceWorker.unregister();
