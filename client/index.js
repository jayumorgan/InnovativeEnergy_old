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

        function lLoadConfigurations() {
            
        }
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