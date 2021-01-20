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