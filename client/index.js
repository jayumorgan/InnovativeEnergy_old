/// <reference path="./js/jquery-3.5.1.min.js" />

(function() {

    /*
    Application-level functionality
    */

    function lMain() {
        lOnGeneralTabClicked()

        $('#general-tab-button').on('click', lOnGeneralTabClicked);
        $('#configuration-tab-button').on('click', lOnConfigurationTabClicked);
    }

    function lOnGeneralTabClicked() {
        $('#general-tab-button').addClass('nav-selected');
        $('#configuration-tab-button').removeClass('nav-selected');
        $('#general-content').css('display', 'inherit');
        $('#configuration-content').css('display', 'none');
    }

    function lOnConfigurationTabClicked() {
        $('#general-tab-button').removeClass('nav-selected');
        $('#configuration-tab-button').addClass('nav-selected');
        $('#configuration-content').css('display', 'inherit');
        $('#general-content').css('display', 'none');

        /*********************************
        Methods dealing with configuration IO
        *********************************/
        function lListConfigs() {
            return fetch('/configuration/list').then(function(pResponse) { return pResponse.json(); });
        }

        function lCreateType(pType) {
            return fetch(`/configuration/createType?type=${pType}`).then(function(pResponse) {
                return pResponse.status === 200;
            });
        }

        function lCreateConfig(pType, pName) {
            return fetch(`/configuration/create?type=${pType}&name=${pName}`, { method: 'POST' }).then(function(pResponse) {
                return pResponse.status === 200;
            });
        }

        function lGetConfiguration(pType, pId) {
            return fetch(`/configuration?type=${pType}&id=${pId}`).then(function(pResponse) {
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

    /*
    Reusable widgets, modals, etc
    */
   function lCreateModal() {
       const lModalBackground = $('<div>').addClass('modal-background').appendTo($('#main-content')),
            lContainer = $('<div>').addClass('modal-container').appendTo(lModalBackground),
            lHeader = $('<header>').appendTo(lContainer),
            lHeaderTitle = $('<h3>').appendTo(lHeader),
            lBody = $('<div>').addClass('modal-body').appendTo(lContainer),
            lFooter = $('<footer>').appendTo(lContainer);

        return lModalBackground;
   }

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

    function lPasswordBox(pInline, pLabel, pValue, pOnChange) {
        const lTextBox = lTextBox(pInline, pLabel, pValue, pOnChange);
        
        lTextBox.find('input').attr('type', 'password');

        return lTextBox;
    }

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

    function lCheckbox(pInline, pLabel, pDefaultValue, pOnChange) {
        const lWrapper = $('<label>').text(pLabel).addClass('widget-checkbox'),
            lInputElement = $('<input>').attr('type', 'checkbox').attr('checked', pDefaultValue).appendTo(lWrapper),
            lSpanElement = $('<span>').addClass('widget-checkmark').appendTo(lWrapper);

        lInputElement.on('change', function(pEvent) {
            pOnChange(lInputElement.val());
        });

        return lWrapper;
    }

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

    function lAppendError(pWidget, pError) {
        return $('<div>').addClass('widget-error').appendTo(pWidget).text(pError);
    }

    function lClearError(pWidget) {
        pWidget.find('.widget-error').remove();
    }
    
    $(document).ready(lMain);
})()