/// <reference path="./widgets.js" />

function getDefaultConfiguration() {
    return {
        waitTimeSeconds: 10
    }
}

function buildEditor(pConfiguration) {
    const lEditorWrapper = $('<div>').addClass('configuration-editor'),
        lWaitTimeEditor = lNumericTextbox(false, 'Wait Time Seconds', pConfiguration.waitTimeSeconds, function(pValue) {
            pConfiguration.waitTimeSeconds = pValue;
        }).appendTo(lEditorWrapper);

    return lEditorWrapper;
}