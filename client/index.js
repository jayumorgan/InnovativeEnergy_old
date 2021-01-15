(function() {
    function lMain() {
        lOnGeneralTabClicked()

        $('#general-tab-button').on('click', lOnGeneralTabClicked);
        $('#configuration-tab-button').on('click', lOnConfigurationTabClicked);
    }

    function lOnGeneralTabClicked() {
        $('#general-tab-button').addClass('selected');
        $('#configuration-tab-button').removeClass('selected');
        $('#general-content').css('display', 'inherit');
        $('#configuration-content').css('display', 'none');
    }

    function lOnConfigurationTabClicked() {
        $('#general-tab-button').removeClass('selected');
        $('#configuration-tab-button').addClass('selected');
        $('#general-content').css('display', 'none');
        $('#configuration-content').css('display', 'inherit');
    }
    
    $(document).ready(lMain);
})()