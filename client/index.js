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
                        lGetSchema(pSchemaInfo.id).then(function(pSchemaConfiguration) {
                            const lSchema = pSchemaConfiguration.schema,
                                lModal = lCreateModal(),
                                lModalBody = lModal.find('.modal-body').css('width', '800px').css('max-height', '512px').css('min-height', '640px'),
                                lSchemaItemList = $('<ul>').addClass('schema-item-editor-list').appendTo(lModalBody).css('padding-right', '1rem'),
                                lValueTypeOptions = [
                                    { value: 1, key: "Number" },
                                    { value: 2, key: "String" },
                                    { value: 3, key: "Boolean" },
                                    { value: 4, key: "Object" }
                                ];
                            
                            lModal.find('header').find('h3').text('Edit ' + pSchemaConfiguration.name + ' Schema (' + pSchemaConfiguration.id + ')');

                            function lAddSchemaToBody(pSchema, pParentElement) {
                                const lSchemaEditorContainer = $('<li>').appendTo(pParentElement);
                                pSchema.forEach(function(pSchemaItem) {
                                    const lName = pSchemaItem.name,
                                        lDefaultValue = pSchemaItem.defaultValue,
                                        lType = pSchemaItem.type,
                                        isRequired = pSchemaItem.isRequired,
                                        lOptions = pSchemaItem.options,
                                        lIsArray = pSchemaItem.isArray;

                                    const lItemWrapper = $('<div>').appendTo(lSchemaEditorContainer),
                                        lNameBox = lTextBox(false, 'Name', lName, function(pNewName) {
                                            pSchemaItem.name = pNewName;
                                        }).appendTo(lItemWrapper),
                                        lTypeBox = lSelect(false, 'Type', typeof(lType) === "object" ? 4 : lType, lValueTypeOptions, function(pNewType) {
                                            pNewType = Number(pNewType);
                                            if (pNewType === 4) {
                                                pSchemaItem.type = []
                                            } else {
                                                pSchemaItem.type = pNewType;
                                            }
                                        }).appendTo(lItemWrapper);
                                        
                                    if (typeof(lType) === "object") {
                                        const lSubSchemaList = $('<ul>').addClass('schema-item-editor-list').appendTo(pParentElement);
                                        lAddSchemaToBody(lType, lSubSchemaList);
                                    } else {

                                    }
                                })
                            }

                            lAddSchemaToBody(lSchema, lSchemaItemList);
                        })
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

    function lCheckbox(pInline, pLabel, pDefaultValue, pOnChange) {

    }

    function lAppendError(pWidget, pError) {
        return $('<div>').addClass('widget-error').appendTo(pWidget).text(pError);
    }

    function lClearError(pWidget) {
        pWidget.find('.widget-error').remove();
    }
    
    $(document).ready(lMain);
})()