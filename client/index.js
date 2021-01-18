/// <reference path="./js/jquery-3.5.1.min.js" />

(function() {

    /*
    Application-level functionality
    */

    function lMain() {
        lOnGeneralTabClicked()

        $('#general-tab-button').on('click', lOnGeneralTabClicked);
        $('#configuration-tab-button').on('click', lOnConfigurationTabClicked);
        $('#schema-tab-button').on('click', lOnSchemaTabClicked);
    }

    function lOnGeneralTabClicked() {
        $('#general-tab-button').addClass('nav-selected');
        $('#schema-tab-button').removeClass('nav-selected');
        $('#configuration-tab-button').removeClass('nav-selected');
        $('#general-content').css('display', 'inherit');
        $('#schema-content').css('display', 'none');
        $('#configuration-content').css('display', 'none');
    }

    function lOnConfigurationTabClicked() {
        $('#general-tab-button').removeClass('nav-selected');
        $('#schema-tab-button').removeClass('nav-selected');
        $('#configuration-tab-button').addClass('nav-selected');
        $('#configuration-content').css('display', 'inherit');
        $('#general-content').css('display', 'none');
        $('#schema-content').css('display', 'none');

        function lLoadConfigurations() {
            
        }
    }

    function lSchemaEditor(pSchemaConfiguration) {
        const lSchema = pSchemaConfiguration.schema,
            lModal = lCreateModal(),
            lModalBody = lModal.find('.modal-body').css('width', '960px').css('max-height', '512px').css('min-height', '640px'),
            lFooter = lModal.find('footer'),
            lFooterContent = $('<div>').addClass('widget-button-group').appendTo(lFooter),
            lCloseButton = $('<button>').addClass('widget-button danger').text('Cancel').appendTo(lFooterContent).on('click', function() {
                lModal.remove();
            })
            lSaveButton = $('<button>').addClass('widget-button primary').text('Save').appendTo(lFooterContent),
            lSchemaItemList = $('<ul>').addClass('schema-item-editor-list').appendTo(lModalBody).css('padding-right', '1rem'),
            lValueTypeOptions = [
                { value: 1, key: "Number" },
                { value: 2, key: "String" },
                { value: 3, key: "Boolean" },
                { value: 4, key: "Object" }
            ];
        
        lModal.find('header').find('h3').text('Edit ' + pSchemaConfiguration.name + ' Schema (' + pSchemaConfiguration.id + ')');

        const lCurrentPath = ['~'];

        function lAddSchemaToBody(pSchema, pParentElement) {
            const lSchemaEditorContainer = $('<li>').appendTo(pParentElement);
            pSchema.forEach(function(pSchemaItem) {
                lCurrentPath.push(pSchemaItem.name);

                const lBreadcrumbIndex = lCurrentPath.length - 1,
                    lItemWrapper = $('<div>').appendTo(lSchemaEditorContainer).addClass('grid-four'),
                    lItemLabel = $('<label>').addClass('schema-path-label').appendTo(lItemWrapper).text(lCurrentPath.join(' > ')),
                    lNameBox = lTextBox(false, 'Member Name',  pSchemaItem.name, function(pNewName) {
                        pSchemaItem.name = pNewName;

                        lItemWrapper.find('.schema-path-label').each(function(pSchemaIndex, pSchemaLabel) {
                            const lSchemaLabelText = $(pSchemaLabel).text(),
                                lSchemaLabelSplitText = lSchemaLabelText.split(' > ');

                            lSchemaLabelSplitText[lBreadcrumbIndex] = pSchemaItem.name;
                            $(pSchemaLabel).text(lSchemaLabelSplitText.join(' > '));
                        });

                    }).appendTo(lItemWrapper),
                    lTypeBox = lSelect(false, 'Member Type', typeof(pSchemaItem.type) === "object" ? 4 : pSchemaItem.type, lValueTypeOptions, function(pNewType) {
                        pNewType = Number(pNewType);
                        if (pNewType === 4) {
                            pSchemaItem.type = []
                        } else {
                            pSchemaItem.type = pNewType;
                        }

                        lUpdateDefaultValueEditor();
                    }).appendTo(lItemWrapper),
                    lUpdateDefaultValueEditor = function() {
                        lDefaultValueWrapper.empty();
                        switch (pSchemaItem.type) {
                            case 1:
                                lDefaultValueWrapper.append(lNumericTextbox(false, 'Default Value', pSchemaItem.defaultValue, function(pValue) {
                                    pSchemaItem.defaultValue = Number(pValue);
                                }));
                                break;
                            case 2:
                                lDefaultValueWrapper.append(lTextBox(false, 'Default Value', pSchemaItem.defaultValue, function(pValue) {
                                    pSchemaItem.defaultValue = pValue;
                                }));
                                break;
                            case 3:
                                lDefaultValueWrapper.append(lCheckbox(false, 'Default Value', pSchemaItem.defaultValue, function(pValue) {
                                    pSchemaItem.defaultValue = Boolean(pValue);
                                }));
                                break;
                            default:
                                break;
                        }
                    },
                    lDefaultValueWrapper = $('<div>').appendTo(lItemWrapper)
                    lCheckMarkGroup = $('<div>').appendTo(lItemWrapper),
                    lIsRequiredCheckbox = lCheckbox(false, 'Is Required', pSchemaItem.isRequired, function(pNewIsRequired) {
                        pSchema.isRequired = Boolean(pNewIsRequired);
                    }).appendTo(lCheckMarkGroup),
                    lIsArrayCheckbox = lCheckbox(false, 'Is Array', pSchemaItem.isArray, function(pNewIsArray) {
                        pSchema.isArray = Boolean(pNewIsArray);
                    }).appendTo(lCheckMarkGroup),
                    lHasOptions = lCheckbox(false, 'Has Options', pSchemaItem.options !== undefined, function(pValue) {
                        pSchema.options = Boolean(pValue) ? [] : undefined;
                    }).appendTo(lCheckMarkGroup),

                lUpdateDefaultValueEditor();
                    
                if (typeof(pSchemaItem.type) === "object") {
                    const lEditorListWrapper = $('<div>').css('grid-column-start', 1).css('grid-column-end', 5).appendTo(lItemWrapper),
                        lSubSchemaList = $('<ul>').addClass('schema-item-editor-list').appendTo(lEditorListWrapper),
                        lAddMemberButton = $('<button>').addClass('schema-add-member-button').append($('<i>').addClass('icon-add-plus'))
                            .append($('<span>').text('Add Member')).appendTo(lItemWrapper);
                    lAddSchemaToBody(pSchemaItem.type, lSubSchemaList);
                };

                lCurrentPath.pop();
            });
        }

        lAddSchemaToBody(lSchema, lSchemaItemList);
    }

    function lOnSchemaTabClicked() {
        $('#schema-tab-button').addClass('nav-selected');
        $('#general-tab-button').removeClass('nav-selected');
        $('#configuration-tab-button').removeClass('nav-selected');
        $('#schema-content').css('display', 'inherit');
        $('#general-content').css('display', 'none');
        $('#configuration-content').css('display', 'none');

        // Schema API
        function lListSchemas() {
            return fetch('/schema/list').then(function(pResponse) { return pResponse.json(); });
        }

        function lGetSchema(lSchemaId) {
            return fetch('/schema?id=' + lSchemaId).then(function(pResponse) { return pResponse.json(); });
        }

        $('#schema-list').empty();
        lListSchemas().then(function(pRetval) {
            const lSchemas = pRetval.schemas;
            lSchemas.forEach(function(pSchemaInfo) {
                const lListItem = $('<li>').appendTo('#schema-list'),
                    lName = $('<span>').appendTo(lListItem).text(pSchemaInfo.name),
                    lEdit = $('<button>').appendTo(lListItem).text('Edit').on('click', function() {
                        lGetSchema(pSchemaInfo.id).then(lSchemaEditor);
                    });
            })
        });
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