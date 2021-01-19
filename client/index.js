/// <reference path="./js/jquery-3.5.1.min.js" />

(function() {
    /******************************************************************
        Configuration IO API
    ******************************************************************/
    function lListConfigs() {
        return fetch('/configuration/list').then(function(pResponse) { return pResponse.json(); });
    }

    function lCreateConfig(pType, pName) {
        return fetch(`/configuration/create?type=${encodeURIComponent(pType)}&name=${encodeURIComponent(pName)}`, { method: 'POST' }).then(function(pResponse) {
            return pResponse.status === 200;
        });
    }

    function lGetConfiguration(pType, pId) {
        return fetch(`/configuration?type=${encodeURIComponent(pType)}&id=${encodeURIComponent(pId)}`).then(function(pResponse) {
            if (pResponse.status === 200) {
                return pResponse.json();
            } else {
                return pResponse.text();
            }
        })
    }

    function lSaveConfiguration(pType, pId, pName, pPayload) {
        return fetch(`/configuration/save?type=${encodeURIComponent(pType)}&id=${encodeURIComponent(pId)}&name=${encodeURIComponent(pName)}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pPayload)
        }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return pResponse.text()
            } else {
                return pResponse.text();
            }
        })
    }

    function lDeleteConfiguration(pType, pId) {
        return fetch(`/configuration/delete?type=${pType}&id=${pId}`, {
            method: 'DELETE'
        }).then(function(pResponse) {
            if (pResponse.status === 200) {
                return true;
            } else {
                return false;
            }
        });
    }

    /******************************************************************
        Runtime API
    ******************************************************************/
    function lStartMachineApp(pType, pId) {
        return fetch(`/run/start?type=${pType}&id=${pId}`, {
            method: 'POST'
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

    /******************************************************************
       General Tab
    ******************************************************************/

    function lMain() {
        $('#general-tab-button').on('click', lOnGeneralTabClicked);
        $('#configuration-tab-button').on('click', lOnConfigurationTabClicked);
        
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
        if ($('#general-content').css('display') === 'none') {
            return;
        }

        const lTimeSeconds = pMessageData.timeSeconds,
            lLevel = pMessageData.level,
            lMessageStr = pMessageData.message,
            lCustomPayload = pMessageData.customPayload;

        switch (lLevel) {
            case 'app_start': {
                $('#run-start-button').empty().append($('<span>').addClass('icon-play')).append($('<div>').text('PAUSE')).addClass('running');
                $('#run-stop-button').addClass('running');
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'app_complete': {
                $('#run-start-button').empty().append($('<span>').addClass('icon-play')).append($('<div>').text('START')).removeClass('running');
                $('#run-stop-button').removeClass('running');
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'app_pause': {
                break;
            }
            case 'app_resume': {
                break;
            }
            case 'app_state_change': {
                lAddMessageToConsole('fa fa-info-circle', lTimeSeconds, lMessageStr);
                break;
            }
            case 'info': {
                break;
            }
            case 'warning': {
                break;
            }
            case 'error': {
                break;
            }
        }
    }

    function lOnGeneralTabClicked() {
        $('#general-tab-button').addClass('nav-selected');
        $('#configuration-tab-button').removeClass('nav-selected');
        $('#general-content').css('display', 'inherit');
        $('#configuration-content').css('display', 'none');

        let lSelectedConfigurationId = undefined,
            lConfigurationSelector = undefined;

        lCreateConfigurationSelector('Runnable', false, 'Select a Config', undefined, function(pSelectedId) {
            lSelectedConfigurationId = Number(pSelectedId);
            lClearError(lConfigurationSelector);
        }).then(function(pSelector) {
            if (pSelector !== undefined) {
                $('#general-content-configuration-selector').empty().append(pSelector)
                lConfigurationSelector = pSelector;
            }
        });

        const lRunStartButton = $('#run-start-button').on('click', function() {
            if (lConfigurationSelector === undefined) {
                console.error('Configuration selector not loaded yet');
                return;
            }

            lClearError(lConfigurationSelector);
            if (lSelectedConfigurationId === undefined) {
                lAppendError(lConfigurationSelector, 'Must select a configuration before running');
                return;
            }

            lRunStartButton.empty();
            lRunStartButton.append($('<div>').addClass('widget-spin-loader'));

            lStartMachineApp('Runnable', lSelectedConfigurationId).then(function(pSuccess) {
                if (pSuccess) {
                } else {
                    // TODO: Show error
                }
            })
        });

        const lRunStopButton = $('#run-stop-button').on('click', function() {
            lRunStopButton.empty();
            lRunStopButton.append($('<div>').addClass('widget-spin-loader'));
        });
    }

    /******************************************************************
        Configuration Tab
    ******************************************************************/
    function lOnConfigurationTabClicked() {
        $('#general-tab-button').removeClass('nav-selected');
        $('#configuration-tab-button').addClass('nav-selected');
        $('#configuration-content').css('display', 'inherit');
        $('#general-content').css('display', 'none');

        const lWrapper = $('#configuration-content').empty(),
            lContentPanel = $('<div>').addClass('content-panel').appendTo(lWrapper).css('height', '99%'),
            lContentPanelHeader = $('<div>').addClass('content-panel-header').text('Configurations').appendTo(lContentPanel),
            lContentPanelBody = $('<div>').addClass('content-panel-body').appendTo(lContentPanel);

        function lReloadConfigurations() {
            lContentPanelBody.empty();
            lContentPanelBody.append($('<div>').css('height', '100%').css('width', '100%').css('display', 'flex').css('align-items', 'center').css('justify-content', 'center')
                .append($('<div>').addClass('widget-spin-loader')).appendTo(lWrapper));;

            lListConfigs().then(function(pConfiguration) {
                lContentPanelBody.empty();
    
                Object.keys(pConfiguration.configurationList).forEach(function(pType) {
                    const lConfigurationList = pConfiguration.configurationList[pType],
                        lListContainer = $('<div>').appendTo(lContentPanelBody).addClass('content-panel'),
                        lListHeader = $('<div>').appendTo(lListContainer).text(pType).addClass('content-panel-header'),
                        lListBody = $('<div>').appendTo(lListContainer).addClass('content-panel-body'),
                        lListElement = $('<ul>').appendTo(lListBody).addClass('configuration-list');
    
                    lConfigurationList.forEach(function(pConfiguration) {
                        const lListItem = $('<li>').appendTo(lListElement).addClass('configuration-list-item'),
                            lTextSpan = $('<label>').text(pConfiguration.name).appendTo(lListItem),
                            lButtonGroup = $('<div>').appendTo(lListItem),
                            lEditButton = $('<button>').text('Edit').prepend($('<i>').addClass('fa fa-edit')).appendTo(lButtonGroup).addClass('edit').on('click', function() {
                                lShowConfigurationEditor(pType, pConfiguration.id);
                            }),
                            lDeleteButton = $('<button>').text('Delete').prepend($('<i>').addClass('icon-delete')).appendTo(lButtonGroup).addClass('delete').on('click', function() {
                                if (window.confirm('Are you sure you want to delete this configuration?')) {
                                    lDeleteConfiguration(pType, pConfiguration.id).then(function(pSuccess) {
                                        if (pSuccess) {
                                            lReloadConfigurations();
                                        } else {
                                            // TODO: Show error
                                        }
                                    })
                                }
                            });
                    });
    
                    const lAddConfigurationButtonContainer = $('<div>').addClass('widget-button-group').appendTo(lListBody),
                        lAddConfigurationButton = $('<button>').addClass('widget-button primary').text('Add Configuration').prepend($('<i>').addClass('icon-add-plus').css('padding-right', '0.5rem'))
                            .appendTo(lAddConfigurationButtonContainer).on('click', function() {
                            const lModal = lCreateModal(),
                                lBody = lModal.find('.modal-body'),
                                lFooter = lModal.find('footer');
        
                            lModal.find('h3').text('Create a New ' + pType + ' Configuration');
        
                            let lNewName = 'New Configuration';
                            const lNameTextBox = lTextBox(false, 'Name', lNewName, function(pName) {
                                    lNewName = pName;
                                }).appendTo(lBody),
                                lButtonGroup = $('<div>').addClass('widget-button-group').appendTo(lFooter),
                                lCancelButton = $('<button>').addClass('widget-button danger').text('Cancel').appendTo(lButtonGroup).on('click', function() { lModal.remove(); } ),
                                lSaveButton = $('<button>').addClass('widget-button primary').text('Save').appendTo(lButtonGroup).on('click', function() {
                                    lCreateConfig(pType, lNewName).then(function(pSuccess) {
                                        if (pSuccess) {
                                            lReloadConfigurations();
                                            lModal.remove();
                                        } else {
                                            // TODO: Throw error
                                        }
                                    })
                                });
                        });
                });
            });
        }

        function lShowConfigurationEditor(pType, pId) {
            const lModal = lCreateModal(),
                lBody = lModal.find('.modal-body').css('width', '960px').css('min-height', '640px').css('max-height', '640px'),
                lFooter = lModal.find('footer'),
                lButtonGroup = $('<div>').addClass('widget-button-group').appendTo(lFooter),
                lCancelButton = $('<button>').addClass('widget-button danger').text('Cancel').appendTo(lButtonGroup).on('click', function() { lModal.remove(); } ),
                lSaveButton = $('<button>').addClass('widget-button primary').text('Save').appendTo(lButtonGroup).on('click', function() {
                    if (lConfiguration === undefined) {
                        // TODO: Throw error
                        return;
                    }

                    lSaveConfiguration(pType, pId, lName, lConfiguration).then(function(pSuccess) {
                        if (pSuccess) {
                            lReloadConfigurations();
                            lModal.remove();
                        } else {
                            // TODO: Throw error
                        }
                    })
                });

            lModal.find('h3').text('Editing configuration ' + pType + ' Configuration');
            
            let lConfiguration = undefined, lName = undefined;
            lGetConfiguration(pType, pId).then(function(pExistingPayload) {
                lConfiguration = pExistingPayload.payload;
                lName = pExistingPayload.name;
                lFillInEditor();
            });

            function lFillInEditor() {
                const lEditorWrapper = $('<div>').appendTo(lBody).css('padding', '0.5rem'),
                    lNameEditor = lTextBox(false, 'Name', lName, function(pName) {
                        lName = pName;
                    }).appendTo(lEditorWrapper);
            }
        }

        lReloadConfigurations();
    }

    /******************************************************************
        Reusable Widgets
    ******************************************************************/
   function lCreateModal() {
       const lModalBackground = $('<div>').addClass('modal-background').appendTo($('#main-content')),
            lContainer = $('<div>').addClass('modal-container').appendTo(lModalBackground),
            lHeader = $('<header>').appendTo(lContainer),
            lHeaderTitle = $('<h3>').appendTo(lHeader),
            lBody = $('<div>').addClass('modal-body').appendTo(lContainer),
            lFooter = $('<footer>').appendTo(lContainer);

        return lModalBackground;
   }

   /**
    * Creates a textbox widget
    * @param {Boolean} pInline 
    * @param {String} pLabel 
    * @param {String} pValue 
    * @param {function(value: String) => void} pOnChange 
    */
   function lTextBox(pInline, pLabel, pValue, pOnChange) {
        const lWrapper = $('<div>').addClass('widget-wrapper').addClass('widget-textbox'),
            lLabel = pLabel ? $('<label>').text(pLabel).appendTo(lWrapper) : undefined,
            lInput = $('<input>').val(pValue).appendTo(lWrapper);

        if (pInline) {
            lWrapper.addClass('inline');
        }

        if (pOnChange) {
            lInput.on('change', function() {
                pOnChange(lInput.val());
            });
        }

        return lWrapper;
    }

    /**
     * Creates a password textbox widget
     * @param {Boolean} pInline 
     * @param {String} pLabel 
     * @param {String} pValue 
     * @param {function(value: String) => void} pOnChange 
     */
    function lPasswordBox(pInline, pLabel, pValue, pOnChange) {
        const lTextBox = lTextBox(pInline, pLabel, pValue, pOnChange);
        
        lTextBox.find('input').attr('type', 'password');

        return lTextBox;
    }

    /**
     * Creates a numeric textbox widget
     * @param {Boolean} pInline 
     * @param {String} pLabel 
     * @param {Number} pValue 
     * @param {function(value: String) => void} pOnChange 
     */
    function lNumericTextbox(pInline, pLabel, pValue, pOnChange) {
        const lTextbox = lTextBox(pInline, pLabel, pValue, function(pNewValue) {
            const lNumVal = Number(pNewValue);
            if (isNaN(lNumVal)) {
                lTextbox.find('input').val(0);
            }

            pOnChange(lNumVal);
        });

        lTextbox.find('input').css('text-align', 'right');

        return lTextbox;
    }

    /**
     * Creates a dropdown selector
     * @param {Boolean} pInline 
     * @param {String} pLabel 
     * @param {Number | String} pValue 
     * @param {Array<{ key: String, value: String | number }} pOptionsList
     * @param {function(value: String) => void} pOnChange 
     */
    function lSelect(pInline, pLabel, pValue, pOptionsList, pOnChange) {
        const lWrapper = $('<div>').addClass('widget-wrapper'),
            lLabel = $('<label>').text(pLabel).appendTo(lWrapper),
            lSelectWrapper = $('<div>').addClass('widget-select').appendTo(lWrapper),
            lSelect = $('<select>').appendTo(lSelectWrapper);

        if (pInline) {
            lWrapper.addClass('inline');
        }

        lSelect.on('change', function() {
            pOnChange(lSelect.val());
        });
        
        pOptionsList.forEach(function(pOption) {
            $('<option>').text(pOption.key).attr('value', pOption.value).appendTo(lSelect);
        });

        lSelect.val(pValue);
        return lWrapper;
    }

    /**
     * Creates a dropdown selector for the specified configuration type
     * @param {String} pType
     * @param {Boolean} pInline 
     * @param {String} pLabel 
     * @param {Number | String} pValue 
     * @param {function(value: String) => void} pOnChange 
     */
    function lCreateConfigurationSelector(pType, pInline, pLabel, pValue, pOnChange) {
        return lListConfigs().then(function(pRetval) {
            const lConfigurationList = pRetval.configurationList[pType];
            if (!lConfigurationList) {
                console.error('Failed to find configuration of type: ' + pType);
                return undefined;
            }

            const lOptionsList = lConfigurationList.map(function(pItem) {
                return { key: pItem.name, value: pItem.id };
            })

            return lSelect(pInline, pLabel, pValue, lOptionsList, function(pNewValue) {
                pOnChange(Number(pNewValue));
            })
        });
    }

    /**
     * Creates a checkbox widget
     * @param {Boolean} pInline 
     * @param {String} pLabel 
     * @param {Boolean} pDefaultValue 
     * @param {function(value: Boolean) -> void} pOnChange 
     */
    function lCheckbox(pInline, pLabel, pDefaultValue, pOnChange) {
        const lWrapper = $('<label>').text(pLabel).addClass('widget-checkbox'),
            lInputElement = $('<input>').attr('type', 'checkbox').attr('checked', pDefaultValue).appendTo(lWrapper),
            lSpanElement = $('<span>').addClass('widget-checkmark').appendTo(lWrapper);

        lInputElement.on('change', function(pEvent) {
            pOnChange(Boolean(lInputElement.val()));
        });

        return lWrapper;
    }

    /**
     * Used to change the options in a selector
     * @param {JQuery<HTMLElement>} pSelect 
     * @param {Array<{ key: String, value: String | number }} pNewOptions 
     * @param {String | Number} pSelectedValue 
     */
    function lUpdateSelectOptions(pSelect, pNewOptions, pSelectedValue) {
        const lSelect = pSelect.find('select');

        pSelect.find('option').remove();
        pNewOptions.forEach(function(pOption) {
            $('<option>').text(pOption.key).attr('value', pOption.value).appendTo(lSelect);
        });

        if (pNewOptions.find(function(pExisting) { return pExisting.value == pSelectedValue; })) {
            lSelect.val(pSelectedValue);
        } else if (pNewOptions.length > 0) {
            lSelect.val(pNewOptions[0].value);
        }
        
        lSelect.trigger('change');
    }

    /**
     * Display an error on any of the widgets
     * @param {JQuery<HTMLElement>} pWidget 
     * @param {String} pError 
     */
    function lAppendError(pWidget, pError) {
        return $('<div>').addClass('widget-error').appendTo(pWidget).text(pError);
    }

    /**
     * Clear an error on any of the widgets
     * @param {JQuery<HTMLElement>} pWidget 
     */
    function lClearError(pWidget) {
        pWidget.find('.widget-error').remove();
    }
    
    $(document).ready(lMain);
})()