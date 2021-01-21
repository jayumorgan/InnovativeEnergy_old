/// <reference path="./js/jquery-3.5.1.min.js" />
/// <reference path="./editor.js" />
/// <reference path="./widgets.js" />

(function() {
    /******************************************************************
        Runtime API
    ******************************************************************/
    function lStartMachineApp(pConfiguration) {
        return fetch(`/run/start`, {
            method: 'POST',
            body: JSON.stringify(pConfiguration),
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            }
        }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        })
    }

    function lStopMachineApp() {
        return fetch('/run/stop', { method: 'POST' }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        })
    }

    function lPauseMachineApp() {
        return fetch('/run/pause', { method: 'POST' }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        })
    }

    function lResumeMachineApp() {
        return fetch('/run/resume', { method: 'POST' }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        })
    }

    function lGetEstop() {
        return fetch('/run/estop').then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        });
    }

    function lSetEstop() {
        return fetch('/run/estop', { method: 'POST' }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        });
    }

    function lReleaseEstop() {
        return fetch('/run/releaseEstop', { method: 'POST' }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        });
    }

    function lResetSystem() {
        return fetch('/run/resetSystem', { method: 'POST' }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        });
    }

    /******************************************************************
       General Tab
    ******************************************************************/

    let lState = 'idle';

    function lMain() {
        $('#general-tab-button').on('click', lOnGeneralTabClicked);
        $('#estop-button').on('click', lOnEstopClicked)
        
        lOnGeneralTabClicked();
        lConnectToSocket();
    }
    
    let lWebsocketConnection = undefined;
    function lConnectToSocket() {
        console.log('Connecting to socket at ws://127.0.0.1:8081');
        lWebsocketConnection = new WebSocket('ws://127.0.0.1:8081');
        lWebsocketConnection.onopen = function(pEvent) {
            console.log('Websocket is online');
        };
        lWebsocketConnection.onclose = function(pEvent) {
            console.log('Websocket connect closed', pEvent);
            const lTimeout = setTimeout(function() { 
                lConnectToSocket();
                clearInterval(lTimeout);
            }, 5000);
        };
        lWebsocketConnection.onmessage = function(pEvent) {
            const lMessageData = JSON.parse(pEvent.data);
            console.log('Received message from the socket connection', lMessageData);
            lOnUpdateMessageReceived(lMessageData);
        };
        lWebsocketConnection.onerror = function(pEvent) {
            console.error('Encountered error in websocket', pEvent);
        };
    }

    function lAddMessageToConsole(pIcon, pTime, pMessage) {
        const lDateTime = new Date(pTime),
            lRow = $('<tr>').prependTo($('#run-information-console')),
            lIcon = $('<td>').append($('<div>').addClass(pIcon)).appendTo(lRow),
            lTimeWrapper = $('<td>').appendTo(lRow),
            lTimeWrapperDiv = $('<div>').appendTo(lTimeWrapper),
            lTimeElement = $('<p>').text(lDateTime.toLocaleDateString()).appendTo(lTimeWrapperDiv).css('margin-bottom', '0').css('margin-top', '0'),
            lDateElement = $('<p>').text(lDateTime.toLocaleTimeString()).appendTo(lTimeWrapperDiv).css('margin-bottom', '0').css('margin-top', '0'),
            lDescription = $('<td>').append($('<span>').text(pMessage)).appendTo(lRow),
            lDismissBtn = $('<td>').append($('<button>').on('click', function() { 
                lRow.remove();
             }).text('Dismiss').addClass('widget-button primary link')).appendTo(lRow);
    }

    function lOnUpdateMessageReceived(pMessageData) {
        const lTimeSeconds = pMessageData.timeSeconds,
            lLevel = pMessageData.level,
            lMessageStr = pMessageData.message,
            lCustomPayload = pMessageData.customPayload;

        switch (lLevel) {
            case 'app_start': {
                lState = 'running';
                $('#run-start-button').empty().append($('<span>').addClass('icon-pause')).append($('<div>').text('PAUSE')).addClass('running');
                $('#run-stop-button').addClass('running');
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'app_complete': {
                lState = 'idle';
                $('#run-start-button').empty().append($('<span>').addClass('icon-play')).append($('<div>').text('START')).removeClass('running');
                $('#run-stop-button').removeClass('running').empty().append($('<span>').addClass('icon-stop')).append($('<div>').text('STOP'));
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'app_pause': {
                $('#run-start-button').empty().append($('<span>').addClass('icon-play')).append($('<div>').text('RESUME')).addClass('running');
                lState = 'paused';
                break;
            }
            case 'app_resume': {
                $('#run-start-button').empty().append($('<span>').addClass('icon-pause')).append($('<div>').text('PAUSE')).addClass('running');
                lState = 'running';
                break;
            }
            case 'app_state_change': {
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'app_estop_set': {
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                lOnEstopSet();
                break;
            }
            case 'app_estop_release': {
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                lOnEstopReleased();
                break;
            }
            case 'info': {
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'warning': {
                lAddMessageToConsole('fa fa-exclamation-triangle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'error': {
                lAddMessageToConsole('fa fa-exclamation-triangle', lTimeSeconds, lMessageStr);
                break;
            }
        }
    }

    function lOnGeneralTabClicked() {
        $('#general-tab-button').addClass('nav-selected');
        $('#general-content').css('display', 'inherit');

        const lRunTimeConfiguration = getDefaultConfiguration();
        $('#general-configuration-editor').empty().append(buildEditor(lRunTimeConfiguration));

        const lRunStartButton = $('#run-start-button').on('click', function() {
            lRunStartButton.empty();
            lRunStartButton.append($('<div>').addClass('widget-spin-loader'));

            switch (lState) {
                case 'idle': {
                    lStartMachineApp(lRunTimeConfiguration).then(function(pSuccess) {
                        if (pSuccess) {
                        } else {
                            // TODO: Show error
                        }
                    });
                    break;
                }
                case 'running': {
                    lPauseMachineApp().then(function(pSuccess) {
                        if (pSuccess) {
                        } else {
                            // TODO: Show error
                        }
                    });
                    break;
                }
                case 'paused': {
                    lResumeMachineApp().then(function(pSuccess) {
                        if (pSuccess) {
                        } else {
                            // TODO: Show error
                        }
                    });
                    break;
                }
            }
        });

        const lRunStopButton = $('#run-stop-button').on('click', function() {
            lRunStopButton.empty();
            lRunStopButton.append($('<div>').addClass('widget-spin-loader'));

            lStopMachineApp().then(function(pSuccess) {
                if (pSuccess) {

                } else {
                    // TODO: Show error
                }
            })
        });
    }

     // Estop functionality
    function lOnEstopClicked() {
        console.log('Estop button clicked.');
        lSetEstop().then(function(pSuccess) {
            if (pSuccess) {

            } else {
                // TODO: Show error
            }
        })
    }

    function lOnEstopSet() {
        if ($('#estop-modal').length > 0) {
            return;
        }

        const lEstopModal = lCreateModal().attr('id', 'estop-modal'),
            lEstopModalHeader = lEstopModal.find('h3').text('E-Stop Activated').prepend($('<i>').addClass('fa fa-exclamation-triangle').css('padding-right', '0.5rem')),
            lBody = lEstopModal.find('.modal-body').addClass('v_layout').css('height', '100%').css('justify-content', 'center').css('align-items', 'center'),
            lActionRequired = $('<div>').append($('<h3>').text('Action Required')).appendTo(lBody),
            lEstopImage = $('<div>').appendTo($('<img>').attr('src', '/images/estop.png')).appendTo(lBody),
            lFirstInfo = $('<div>').append($('<p>').text('Ensure your E-Stop buttons are released. Click to release software stop.')).appendTo(lBody),
            lReleaseButton = $('<div>').append($('<button>').addClass('widget-button danger').text('RELEASE').on('click', function() {
                lReleaseEstop().then(function(pSuccess) {
                    if (pSuccess) {

                    } else {
                        // TODO: Show error
                    }
                })
            })).appendTo(lBody),
            lSecondInfo = $('<div>').append($('<p>').text('When ready, click to reset your machine')).appendTo(lBody),
            lResetButton = $('<div>').append($('<button>').addClass('widget-button success').text('RESET').on('click', function() {
                lResetSystem().then(function(pSuccess) {
                    if (pSuccess) {

                    } else {
                        // TODO: Show error
                    }
                })
            })).appendTo(lBody);

    }

    function lOnEstopReleased() {
        $('#estop-modal').remove();
    }
    
    $(document).ready(lMain);
})()