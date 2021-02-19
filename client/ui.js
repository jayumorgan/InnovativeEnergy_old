/// <reference path="./widgets.js" />

/**
 * Populates the configuration editor in the 'Execute' panel with this default data
 */
function getDefaultConfiguration() {
    return {
        fullSpeed: 15,
        slowSpeed: 10,
        greenTimer: 10,
        yellowTimer: 2,
        redTimer: 2,
        pedestrianTimer: 20
    }
}

/**
 * Constructs the editor that you see above the play/stop buttons in the 'Execute' panel
 * @param {Object} pConfiguration editable configuration 
 */
function buildEditor(pConfiguration) {
    const lEditorWrapper = $('<div>').addClass('configuration-editor'),
        lFullSpeedEitor = numericInput('Conveyor Full Speed', pConfiguration.fullSpeed, function(pValue) {
            pConfiguration.fullSpeed = pValue;
        }).appendTo(lEditorWrapper),
        lSlowSpeedEditor = numericInput('Conveyor slow Speed', pConfiguration.slowSpeed, function(pValue) {
            pConfiguration.slowSpeed = pValue;
        }).appendTo(lEditorWrapper),
        lGreenTimer = numericInput('Green Light Timer', pConfiguration.greenTimer, function(pValue) {
            pConfiguration.greenTimer = pValue;
        }).appendTo(lEditorWrapper),
        lYellowTimer = numericInput('Yellow Light Timer', pConfiguration.yellowTimer, function(pValue) {
            pConfiguration.yellowTimer = pValue;
        }).appendTo(lEditorWrapper),
        lRedTimer = numericInput('Red Light Timer', pConfiguration.redTimer, function(pValue) {
            pConfiguration.redTimer = pValue;
        }).appendTo(lEditorWrapper),
        lPedestrianTimer = numericInput('Pedestrian Light Timer', pConfiguration.pedestrianTimer, function(pValue) {
            pConfiguration.pedestrianTimer = pValue;
        }).appendTo(lEditorWrapper);
        numericInput('Pedestrian Light Timer', pConfiguration.pedestrianTimer, function(pValue) {
            pConfiguration.pedestrianTimer = pValue;
        }).appendTo(lEditorWrapper),
        numericInput('Pedestrian Light Timer', pConfiguration.pedestrianTimer, function(pValue) {
            pConfiguration.pedestrianTimer = pValue;
        }).appendTo(lEditorWrapper);

    return lEditorWrapper;
}

/**
 * Message received from the Notifier on the backend
 * @param {NotificationLevel} pLevel
 * @param {string} pMessageStr 
 * @param {Object | None} pMessagePayload 
 */
function onNotificationReceived(pLevel, pMessageStr, pMessagePayload) {
    const lCustomContainer = $('#custom-container');
    if (pLevel === 'app_pause') {
        lCustomContainer.css('filter', 'blur(5px)')
    } else if (pLevel === 'app_resume') {
        lCustomContainer.css('filter', 'none');
    } else if (pLevel === 'app_complete') {
        lCustomContainer.empty();
    } else if (pLevel === 'app_start') { // Refresh the custom container when we start the app
        lCustomContainer.empty();
        const lHorizontalDistanceTravelled = $('<div>').addClass('distance-travelled-container')
                .append($('<label>').text('Horizontal Distance Travelled'))
                .append($('<span>').text('0 m'))
                .appendTo(lCustomContainer),
            lVerticalDistancedTravelled = $('<div>').addClass('distance-travelled-container')
                .append($('<label>').text('Vertical Distance Travelled'))
                .append($('<span>').text('0 m'))
                .appendTo(lCustomContainer),
            lLightContainer = $('<div>').addClass('h_layout').appendTo(lCustomContainer),
            lCreateLightIndicator = function(pName) {
                const lLightIndicator = $('<div>').addClass('v_layout').addClass('light-container'),
                    lLabel = $('<label>').appendTo(lLightIndicator).text(pName),
                    lRedLightIndicator = $('<div>').appendTo(lLightIndicator)
                        .append($('<input>').attr('type', 'radio').addClass('red-light-indicator').prop('checked', true))
                        .append($('<label>').text('Red')),
                    lYellowLightIndicator = $('<div>').appendTo(lLightIndicator)
                        .append($('<input>').attr('type', 'radio').addClass('yellow-light-indicator'))
                        .append($('<label>').text('Yellow')),
                    lGreenLightIndicator  = $('<div>').appendTo(lLightIndicator)
                        .append($('<input>').attr('type', 'radio').addClass('green-light-indicator'))
                        .append($('<label>').text('Green'));

                return lLightIndicator;
            },
            lCreatePedestrianLight = function() {
                const lLightIndicator = $('<div>').addClass('v_layout').addClass('light-container'),
                    lLabel = $('<label>').appendTo(lLightIndicator).text('Pedestrian Light'),
                    lNoGo = $('<div>').appendTo(lLightIndicator)
                        .append($('<input>').attr('type', 'radio').addClass('no-go-indicator').prop('checked', true))
                        .append($('<label>').text('No-go')),
                    lGo = $('<div>').appendTo(lLightIndicator)
                        .append($('<input>').attr('type', 'radio').addClass('go-indicator'))
                        .append($('<label>').text('Go'));

                return lLightIndicator;
            },
            lCreateButtonDownStatus = function() {
                const lContainer = $('<div>').addClass('v_layout').addClass('light-container'),
                    lLabel = $('<label>').appendTo(lContainer).text('Button State'),
                    lNo = $('<div>').appendTo(lContainer)
                        .append($('<input>').attr('type', 'radio').addClass('pedestrian-btn-no').prop('checked', true))
                        .append($('<label>').text('Pedestrian Btn Not Clicked')),
                    lYes = $('<div>').appendTo(lContainer)
                        .append($('<input>').attr('type', 'radio').addClass('pedestrian-btn-yes'))
                        .append($('<label>').text('Pedestrian Btn Clicked'));

                return lContainer;
            },
            lHorizontalLightIndicator = lCreateLightIndicator('Horizontal Traffic Light').appendTo(lLightContainer).attr('id', 'horizontal-light-indicator'),
            lVerticalLightIndicator = lCreateLightIndicator('Vertical Traffic Light').appendTo(lLightContainer).attr('id', 'vertical-light-indicator'),
            lPedestrianLight = lCreatePedestrianLight().appendTo(lLightContainer).attr('id', 'pedestrian-light-indicator'),
            lButtonDownStatus = lCreateButtonDownStatus().attr('id', 'button-state-indicator').appendTo(lLightContainer);
    }

    if (pMessagePayload == undefined) {
        return;
    }

    if (pLevel === 'io_state') {
        if (pMessagePayload.name === 'push_button_1') {
            $('#button-state-indicator').find('.pedestrian-btn-no').prop('checked', pMessagePayload.value !== 'true');
            $('#button-state-indicator').find('.pedestrian-btn-yes').prop('checked', pMessagePayload.value === 'true');
        }
        return;
    }

    const lDirection = pMessagePayload.direction,
        lColor = pMessagePayload.color,
        speed = pMessagePayload.speed,
        lPedestriansCrossing = pMessagePayload.pedestriansCrossing;
        
    if (lDirection && lColor) {
        let lTrafficLight = undefined;

        switch (lDirection) {
            case 'horizontal': {
                lTrafficLight = $('#horizontal-light-indicator');
                break;
            }
            case 'vertical': {
                lTrafficLight = $('#vertical-light-indicator');
                break;
            }
        }

        if (lTrafficLight) {
            switch (lColor) {
                case 'green': {
                    lTrafficLight.find('.green-light-indicator').prop('checked', true);
                    lTrafficLight.find('.red-light-indicator').prop('checked', false);
                    lTrafficLight.find('.yellow-light-indicator').prop('checked', false);
                    break;
                }
                case 'yellow': {
                    lTrafficLight.find('.green-light-indicator').prop('checked', false);
                    lTrafficLight.find('.red-light-indicator').prop('checked', false);
                    lTrafficLight.find('.yellow-light-indicator').prop('checked', true);
                    break;
                }
                case 'red': {
                    lTrafficLight.find('.green-light-indicator').prop('checked', false);
                    lTrafficLight.find('.red-light-indicator').prop('checked', true);
                    lTrafficLight.find('.yellow-light-indicator').prop('checked', false);
                    break;
                }
            }
        }
    } else if (lPedestriansCrossing !== undefined) {
        $('#pedestrian-light-indicator').find('.no-go-indicator').prop('checked', !lPedestriansCrossing);
        $('#pedestrian-light-indicator').find('.go-indicator').prop('checked', lPedestriansCrossing)
    }
}