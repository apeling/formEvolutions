@TG ?= {}
TG.IFRIS ?= {}
TG.IFRIS.Routes ?= {}

###
This class is a core class and as such is only intended to be extended.
  Assumes
    jQuery with $ accessor
    TG.ui.Notification
    jQuery validator
    json2
    SessionStatus
    tooltipSter
    jGrowl
###
class TG.IFRIS.FormCore
  constructor:(@oVars)->
    @oVars = if @oVars then @oVars else {}
    @oData = @oVars.dataModel #Any old kind of model data. Could be used to populate options in a select.
    @sFormID = @oVars.formID #HTML ID of the form Element

    @$eForm = $(@sFormID) #Shorty.
    @oTip = {theme:"ifris-standard"}
    @bChanged = false
    @bUseReqIcon = if @oVars.requiredIconLogic? then @oVars.requiredIconLogic else true
    @sReqString = "This field is required."
    @bChecking = false
    @bSubmitting = false
    @bSendUncheckedBoxes = true

    # Values to exclude from the "changed" checker
    @oExclude = {}

    # Default values that can pass through "changed" checker
    @oDefaults = {}

    # Safety first
    @bSaving = false #True while waiting for response from ajax request
    @EditMode = false #Set to true if this form is being used to update/edit existing data

    #True after a successful ajax request. Could / should be set to false if in editMode and changes have been made.
    #If not in edit mode this boolean should never be flipped back to false
    @bSubmitted = false

    @aTips = []
    @Rules = {}
    @oMessages = {}

    #These "on" functions should be defined by extending class
    @fInputError = null
    @fFocusOut = null
    @fErrorPlacement = null
    @fInputSuccess = null
    @fInvalid = null

    @bFocusInvalid = true
    @aChanges = []
    @validator = {}

    #List of fields that need to be deserialized further from a CSV
    @oCSVArrays = {}

    @acSavingNotice = new TG.ui.Notification({className:"savingWarning", message:"Saving..."})

  # A few standard form validatation helpers. This method can be expanded upon here or if very specific implemented in Child class.
  setValidateHelpers:()->

    if @bUseReqIcon
      @fErrorPlacement = (error, element)->
        if error.text() != ""
          $eEle = $(element).parent()
          # Change error attachment based on html structure
          if $eEle.hasClass("input-append") or $eEle.hasClass("input-prepend")
            $ePar = $eEle.parent()
            $eReq = $eEle.find(".reqIcon")
            $eReq.removeClass("goodToGo")
            $eIcon = $eEle.find(".reqIcon i")
            if $eIcon[0]
              $eIcon.removeClass("icon-thumbs-up").addClass("icon-hand-left")
            error.insertAfter($ePar);
          else
            error.insertAfter(element);

      #If the input has been flagged as valid update our icons. Add "goodToGo" css class. Change icon.
      @fInputError = (element, errorClass)->
        $eEle = $(element).parent()

        if $eEle.hasClass("input-append")
          $eEle.find(".reqIcon").removeClass("goodToGo")
          $eEle.find(".reqIcon i").removeClass("icon-thumbs-up").addClass("icon-hand-left")

      #If the input has been flagged as valid update our icons. Add "goodToGo" css class. Change icon.
      @fInputSuccess = (label, element)->
        $eEle = $(element).parent()
        # Kinda dumb. An error label is generated if this function exists. Thus we exterminate.
        if label?
          label.remove()
        if $eEle.hasClass("input-append")
          $eEle.find(".reqIcon").addClass("goodToGo")
          $eEle.find(".reqIcon i").removeClass("icon-hand-left").addClass("icon-thumbs-up")

      # Check the number of invalids. If > 0 scroll to the first invalid field
      @fInvalid = (form, validator)=>
        if @bChecking and validator.numberOfInvalids()
          oFirst = validator.errorList[0]
          nTop = $(oFirst.element).offset().top
          $('html, body').animate({
            scrollTop: $(oFirst.element).offset().top
          }, 500);

    $.validator.addMethod("numbersonly",
      (value, element) ->
        @optional(element) || /^[0-9 ,.'-']+$/i.test(value)
      , "Only numbers allowed")

    $.validator.addMethod("lettersonly",
      (value, element) ->
        @optional(element) || /^[a-z ,.'-']+$/i.test(value)
      , "Numbers are not allowed")

    $.validator.addMethod("autoCap",
      (value, element) ->
        sNew = value.capitalize()
        $(element).val(sNew)
        return true;
      , "Numbers are not allowed")

    $.validator.addMethod("todayOrBefore",
      (value, element) ->
        today = new Date()
        enteredDate = Date.parse(value)

        @optional(element) || enteredDate <= today
      , "Date must be on or before today")

    $.validator.addMethod("validZip",
      (value, element) ->
        oZip = new RegExp("^\\d{5}(?:[-\\s]\\d{4})?$")
        @optional(element) || oZip.test(value)
      , "Invalid zip code format: Use ##### or ##### #### or #####-####")

    $.validator.addMethod("validPhone",
      (value, element) ->
        $eInput = $(element)

        #If the entry box is not currently focused AND the string is not empty attempt to place dashes.
        if !$eInput.is(":focus") and value isnt ""
            value = value.replace(/\D/g, '');
            value = value.slice(0,3)+"-"+value.slice(3,6)+"-"+value.slice(6,15);
            if !value.has("--")
              $eInput.val(value)

        @optional(element) || /^\d{3}-\d{3}-\d{4}$/i.test(value)
      , "Invalid phone format. Use: ###-###-####")
    $.validator.addMethod("dollarsandcents",
      (value, element) ->
        dollarsandcentsTest = new RegExp("^\\d+(.\\d{2})?$")
        @optional(element) || dollarsandcentsTest.test(value)
      , "Please enter dollar amount, with optional decimal and two digits for cents."
    )

  # Just a placeholder / example
  setupTooltips:()->
    #Tip array should be structured as seen below

    # @aTips = [
    #   {id:"#contactFirstName", text:"Enter a first name"}
    #   {id:"#contactMiddleName", text:"Enter a middle name"}
    # ]

  #Loop through tooltip array and instantiate tooltips plugin for each field
  applyTooltipping:() =>
    for oTip in @aTips
      sText = if @$eForm.find(oTip.id).prop("required") then oTip.text + " (required)" else oTip.text
      @$eForm.find(oTip.id).attr("title", sText).tooltipster(@oTip);

  #Add onChange listeners to every input.
  addChangeEvents:()=>
    fChange = (eInput)=>
      $eInput = $(eInput)
      $eInput.on("change", (e)=>
        setTimeout(()=>
          @checkOnChange()
        , 300)
      )

    $eTemp = @$eForm.find("input")
    for eInput in $eTemp
      fChange(eInput)

    $eTemp = @$eForm.find("select")
    for eSelect in $eTemp
      fChange(eSelect)

  checkOnChange:()=>
    @getStuff()
    if @aChanges.length
      $(window).on('beforeunload', @showUnsaved)
    else
      @killAlert()

  showUnsaved:(e)=>
    sChanges = ""
    for sText in @aChanges
      sChanges += "#{sText}\n"

    return sChanges

  # Extend to add custom rules
  setupValidatorRules:()=>
    @oRules = {}

  # Extend to add custom messages rules
  setupValidatorMessages:()=>
    @oMessages = {}

  # Define the validation rules for the given form and then initialize the validation plugin.
  # IMPORTANT Note: .validate does NOT actually validate the form. Use .valid (as seen in validate function)
  setupValidators:()=>
    @setValidateHelpers()

    @setupValidatorRules()
    @setupValidatorMessages()

    oV =
      debug:true
      ignore: '.ignore, :hidden:not(.to-chosen)'
      rules:@oRules
      messages:@oMessages
      # onfocusout:@fFocusOut
      highlight:@fInputError
      errorPlacement:@fErrorPlacement
      success:@fInputSuccess
      invalidHandler:@fInvalid
      focusInvalid:@bFocusInvalid

    @validator = @$eForm.validate(oV);

  # Do a validation pass before attempting to pass the buck
  validate:(e, bSubmit, bCheckReadOnly, bSerializeNestedJson)=>
    @bChecking = true
    readonly = $('input[readonly]')
    if bCheckReadOnly
      readonly.prop('readonly', false)

    bPassed = @$eForm.valid();

    readonly.prop('readonly', true)

    @bChecking = false

    if bSubmit and bPassed
      if bSerializeNestedJson
        oResults = JSON.stringify($(@sFormID).serializeJSON({useIntKeysAsArrayIndex: true}))
      else
        oResults = @getStuff()

      @attemptSubmit(oResults)

  # Check if we are saving or the form has been submitted. Submitted is just a failsafe if a redirect does not happen.
  # For editing forms this method should be overridden.
  attemptSubmit:(sJSON) =>
    if not @bSaving and not @bSubmitted
      @acSavingNotice.append()

      @goAjaxGo(sJSON)

  getSubmitUrl:()=>
    # console.log "TG.IFRIS.Routes.submitUrl #{TG.IFRIS.Routes.submitUrl}"
    return TG.IFRIS.Routes.submitUrl

  #Removes the listener that fires before the user can navigate away from this page.
  killAlert:()=>
    $(window).off('beforeunload')
    window.onbeforeunload = null;

  # This may need to be overridden for each type of form.
  # Setup for a basic ajax with JSON request.
  goAjaxGo:(sJSON) =>
    @killAlert()

    $.ajax
      cache: false
      url: @getSubmitUrl()
      data:sJSON
      accepts:
        text:"application/json"
      dataType: "json"
      contentType: 'application/json; charset=UTF-8'
      type:"POST"

      success: (data, status, headers, config)=>
        if TG.Timeout?
          TG.Timeout.refresh();
        @killAlert()
        @submitSuccess(data, status, headers, config)

      error: (e)=>
        if TG.Timeout?
          TG.Timeout.keepAlive();
        @submitFailed(e)

  submitSuccess:(data, status, headers, config)=>
    @bSubmitted = true
    @bSaving = false
    @acSavingNotice.detach()
    @killAlert()

  submitFailed:(e) =>
    @acSavingNotice.detach()
    @bSaving = false
    if e.status == 400
      @fail400(e)
    else
      @failOther(e)

  fail400:(e)=>
    sRT = ""
    if e? and e.statusText? and e.statusText isnt ""
      sRT += @attemptErrorParse(e.statusText) + ". "
    if e? and e.responseText? and e.responseText isnt ""
      sRT += @attemptErrorParse(e.responseText)
    if sRT is ""
      sRT = "Error completing your request"

    $.jGrowl sRT, { life: 10000, theme: 'error' }

  attemptErrorParse:(sText)=>
    try
      sR = JSON.parse(e.responseText)[0]
    catch e
      sR = sText

    return sR

  failOther:(e) =>
    $.jGrowl "Error on submission attempt. You may not be logged in.", { life: 10000, theme: 'error' }

  # Allows for the repopluation of the form from a correctly structured JSON object
  populateForm:(oPop)=>
    for sName of oPop
      $eFound = $("[name='#{sName}']")

      #Special handling for check inputs. Everything else (including selects work with "val")
      if $eFound.attr("type") == "checkbox" and (oPop[sName] == "on" or oPop[sName] == true)
        $eFound.prop( "checked", true )
      else if $eFound.attr("type") == "radio"
        sValue = if oPop[sName]? then oPop[sName] else ''
        $("[name='#{sName}'][value='#{sValue}']").prop( "checked", true )
      else
        $eFound.val(oPop[sName])

  #Clean the form entirely. No checking for defaults. No $200 for passing go.
  clearForm:() ->
    $eTemp = @$eForm.find("input")
    for $eInput in $eTemp
      $eInput = $($eInput)

      if $eInput.attr("type") == "checkbox"
        $eInput.prop( "checked", false )
      else if $eInput.attr("type") != "radio"
        $eInput.val(null)

  #Get all the values from the form, serialize them, check for changes, JSON em, and then return the JSON string
  getStuff:(bObj)=>
    aValues = @$eForm.serializeArray()

    # This will find a checkbox and its value regardless. Unchecked boxes are not grabbed in the serializeArray call
    if @bSendUncheckedBoxes
      sFind = @sFormID + " input[type=checkbox]:not(:checked)"
      aValues = aValues.concat(
        $(sFind).map(
          ()->
            return {"name": this.name, "value": false}
          ).get()
      );

    # Reformat from default wordy style of {name:"firstName", value:"FirstNameValue"}
    @bChanged = false
    oJSON = @formatJSON(aValues)

    #Check to see if any values have changed from the defaults
    @checkForChanges(oJSON)

    sJSON = JSON.stringify(oJSON)
    if bObj
      return oJSON
    else
      return sJSON

  # Will scour the object of fieldIDs and check to see if each field has changed from the default
  # If any fields have a default value that value and the fieldID should be in the defaults object
  # This can be overridden by adding a fieldID to the @oExclude. Any fields found in there will not be checked
  # Ex @oDefaults = {stateID:"VA", bagel:"blueberry"}
  # Ex @oExclude = {bagel:true} //Now field "bagel" will no longer be checked to see if it has changed from "blueberry"
  checkForChanges:(oItems)=>
    @aChanges = []
    for sID of oItems

      item = $("input[name='#{sID}']")
      #search for item by name if sID doesnt find it. Useful for radio yes/no buttons
      if !item[0]?
        item = $("##{sID}")
        if !item[0]?
          @oExclude[sID] = true
      if oItems[sID]? and !@oExclude[sID]
        #Find the label element and use its text if available instead of the fieldID
        $eweh = $( "[for='#{sID}']" )
        $eweh = if $eweh[0]? then $eweh else $( "[for='#{item.prop('id')}']" )
        sLabel = if $eweh[0]? then $eweh.text() else sID

        #Pretty up that display """" looks bad compared to "empty".
        sTo = if oItems[sID] == "" then "empty" else oItems[sID]

        sLName = item[0].localName
        if sLName is "select"
          $eFoundOpt = item.find("option[value='#{oItems[sID]}']")
          if $eFoundOpt?
            sTo = item.find("option[value='#{oItems[sID]}']").text()
            if sTo == ""
              sTo = "empty"

        #If the fieldID has a default value check it. Otherwise check if it has changed from an empty string
        if @oDefaults[sID]?
          if String(oItems[sID]) != String(@oDefaults[sID])
            @bChanged = true
            sFrom = if @oDefaults[sID] == "" then "empty" else @oDefaults[sID]
            if sLName is "select"
              $eFoundOpt = item.find("option[value='#{@oDefaults[sID]}']")
              if $eFoundOpt?
                sFrom = item.find("option[value='#{@oDefaults[sID]}']").text()
                if sFrom == ""
                  sFrom = "empty"
            @aChanges.push(@changeText(sLabel, sFrom, sTo))
        else if oItems[sID] != ""
          @bChanged = true
          @aChanges.push(@changeText(sLabel, "empty", sTo))

  #Modular like a boss. Use to format the item text however you want.
  changeText:(sLabel, sFrom, sTo)=>
    return "#{sLabel} was changed from \"#{sFrom}\" to \"#{sTo}\""

  # Reformats object to this {firstName:FirstNameValue}
  formatJSON:(aValues) =>
    oJSON = {}

    for oI in aValues
      if(oJSON[oI.name])
        oJSON[oI.name] += ',' + oI.value
      else
        oJSON[oI.name] = oI.value

      if oI.value == "on"
        oJSON[oI.name] = true

    return oJSON
