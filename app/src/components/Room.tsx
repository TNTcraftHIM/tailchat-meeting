import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as appPropTypes from './appPropTypes';
import { withStyles } from '@material-ui/core/styles';
import isElectron from 'is-electron';
import { idle } from '../utils';
import FullScreen from './FullScreen';
import { FormattedMessage } from 'react-intl';
import CookieConsent from 'react-cookie-consent';
import CssBaseline from '@material-ui/core/CssBaseline';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import { Notifications } from './Notifications/Notifications';
import { MeetingDrawer } from './MeetingDrawer/MeetingDrawer';
import AudioPeers from './PeerAudio/AudioPeers';
import { FullScreenView } from './VideoContainers/FullScreenView';
import { VideoWindow } from './VideoWindow/VideoWindow';
import { LockDialog } from './AccessControl/LockDialog/LockDialog';
import { Settings } from './Settings/Settings';
import { TopBar } from './Controls/TopBar';
import WakeLock from 'react-wakelock-react16';
import { ExtraVideo } from './Controls/ExtraVideo';
import ButtonControlBar from './Controls/ButtonControlBar';
import { Help } from './Controls/Help';
import { About } from './Controls/About';
import { RolesManager } from './Controls/RolesManager';
import { LeaveDialog } from './LeaveDialog';
import { config } from '../config';
import type { AppState } from '../store/slices';
import { toolareaActions } from '../store/slices/toolarea';
import { roomActions } from '../store/slices/room';
import { RoomMainView } from './RoomMainView';

const TIMEOUT = config.hideTimeout || 5000;

const styles = (theme) => ({
  root: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--background-color)',
    backgroundImage: `url(${config.background})`,
    backgroundAttachment: 'fixed',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  },
  drawer: {
    width: '30vw',
    flexShrink: 0,
    [theme.breakpoints.down('lg')]: {
      width: '30vw',
    },
    [theme.breakpoints.down('md')]: {
      width: '40vw',
    },
    [theme.breakpoints.down('sm')]: {
      width: '60vw',
    },
    [theme.breakpoints.down('xs')]: {
      width: '80vw',
    },
  },
  drawerPaper: {
    width: '30vw',
    [theme.breakpoints.down('lg')]: {
      width: '30vw',
    },
    [theme.breakpoints.down('md')]: {
      width: '40vw',
    },
    [theme.breakpoints.down('sm')]: {
      width: '60vw',
    },
    [theme.breakpoints.down('xs')]: {
      width: '80vw',
    },
  },
});

interface RoomProps {
  room: AppState['room'];
  browser: any;
  showNotifications: any;
  buttonControlBar: any;
  drawerOverlayed: any;
  toolAreaOpen: any;
  toggleToolArea: any;
  classes: any;
  theme: any;
  showToolbar: boolean;
  setToolbarsVisible: (visible: boolean) => void;
}
class Room extends React.PureComponent<RoomProps> {
  fullscreen = new FullScreen(document);

  state = {
    fullscreen: false,
    moving: false,
  };

  waitForHide = idle(() => {
    this.props.setToolbarsVisible(false);
  }, TIMEOUT);

  handleMovement = () => {
    // If the toolbars were hidden, show them again when
    // the user moves their cursor.
    if (!this.props.room.toolbarsVisible) {
      this.props.setToolbarsVisible(true);
    }

    this.waitForHide();
  };

  componentDidMount() {
    if (this.fullscreen.fullscreenEnabled) {
      this.fullscreen.addEventListener(
        'fullscreenchange',
        this.handleFullscreenChange
      );
    }

    window.addEventListener('mousemove', this.handleMovement);
    window.addEventListener('touchstart', this.handleMovement);
  }

  componentWillUnmount() {
    if (this.fullscreen.fullscreenEnabled) {
      this.fullscreen.removeEventListener(
        'fullscreenchange',
        this.handleFullscreenChange
      );
    }

    window.removeEventListener('mousemove', this.handleMovement);
    window.removeEventListener('touchstart', this.handleMovement);
  }

  handleToggleFullscreen = () => {
    if (this.fullscreen.fullscreenElement) {
      this.fullscreen.exitFullscreen();
    } else {
      this.fullscreen.requestFullscreen(document.documentElement);
    }
  };

  handleFullscreenChange = () => {
    this.setState({
      fullscreen: this.fullscreen.fullscreenElement !== null,
    });
  };

  render() {
    const {
      room,
      browser,
      showNotifications,
      buttonControlBar,
      drawerOverlayed,
      toolAreaOpen,
      toggleToolArea,
      classes,
      theme,
    } = this.props;

    const container = window !== undefined ? window.document.body : undefined;

    return (
      <div className={classes.root}>
        {!isElectron() && (
          <CookieConsent
            buttonText={
              <FormattedMessage
                id="room.consentUnderstand"
                defaultMessage="I understand"
              />
            }
          >
            <FormattedMessage
              id="room.cookieConsent"
              defaultMessage="This website uses cookies to enhance the user experience"
            />
          </CookieConsent>
        )}

        <FullScreenView />

        <VideoWindow />

        <AudioPeers />

        {showNotifications && <Notifications />}

        <CssBaseline />

        <TopBar
          fullscreenEnabled={this.fullscreen.fullscreenEnabled}
          fullscreen={this.state.fullscreen}
          onFullscreen={this.handleToggleFullscreen}
        />

        {browser.platform === 'mobile' || drawerOverlayed ? (
          <nav>
            <Hidden implementation="css">
              <SwipeableDrawer
                container={container}
                variant="temporary"
                anchor={theme.direction === 'rtl' ? 'right' : 'left'}
                open={toolAreaOpen}
                onClose={() => toggleToolArea()}
                onOpen={() => toggleToolArea()}
                classes={{
                  paper: classes.drawerPaper,
                }}
                ModalProps={{
                  keepMounted: true, // Better open performance on mobile.
                }}
              >
                <MeetingDrawer closeDrawer={toggleToolArea} />
              </SwipeableDrawer>
            </Hidden>
          </nav>
        ) : (
          <nav className={toolAreaOpen ? classes.drawer : null}>
            <Hidden implementation="css">
              <Drawer
                variant="persistent"
                anchor={theme.direction === 'rtl' ? 'right' : 'left'}
                open={toolAreaOpen}
                onClose={() => toggleToolArea()}
                classes={{
                  paper: classes.drawerPaper,
                }}
              >
                <MeetingDrawer closeDrawer={toggleToolArea} />
              </Drawer>
            </Hidden>
          </nav>
        )}

        {browser.platform === 'mobile' && browser.os !== 'ios' && <WakeLock />}

        {/* 主界面 */}
        <RoomMainView />

        {(buttonControlBar || room.hideSelfView) && <ButtonControlBar />}

        {room.lockDialogOpen && <LockDialog />}

        {room.settingsOpen && <Settings />}

        {room.extraVideoOpen && <ExtraVideo />}
        {room.helpOpen && <Help />}
        {room.aboutOpen && <About />}
        {room.rolesManagerOpen && <RolesManager />}
        {room.leaveOpen && <LeaveDialog />}
      </div>
    );
  }
}

(Room as any).propTypes = {
  room: appPropTypes.Room.isRequired,
  browser: PropTypes.object.isRequired,
  showNotifications: PropTypes.bool.isRequired,
  buttonControlBar: PropTypes.bool.isRequired,
  drawerOverlayed: PropTypes.bool.isRequired,
  toolAreaOpen: PropTypes.bool.isRequired,
  setToolbarsVisible: PropTypes.func.isRequired,
  toggleToolArea: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

const mapStateToProps = (state: AppState) => ({
  room: state.room,
  browser: state.me.browser,
  showNotifications: state.settings.showNotifications,
  buttonControlBar: state.settings.buttonControlBar,
  drawerOverlayed: state.settings.drawerOverlayed,
  toolAreaOpen: state.toolarea.toolAreaOpen,
  showToolbar: state.room.toolbarsVisible || state.settings.permanentTopBar,
});

const mapDispatchToProps = (dispatch) => ({
  setToolbarsVisible: (visible: boolean) => {
    dispatch(roomActions.set('toolbarsVisible', visible));
  },
  toggleToolArea: () => {
    dispatch(toolareaActions.toggleToolArea());
  },
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  areStatesEqual: (next, prev) => {
    return (
      prev.room === next.room &&
      prev.me.browser === next.me.browser &&
      prev.settings.showNotifications === next.settings.showNotifications &&
      prev.settings.buttonControlBar === next.settings.buttonControlBar &&
      prev.settings.drawerOverlayed === next.settings.drawerOverlayed &&
      prev.toolarea.toolAreaOpen === next.toolarea.toolAreaOpen
    );
  },
})(withStyles(styles, { withTheme: true })(Room));
