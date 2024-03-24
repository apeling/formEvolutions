@TG ?= {}
TG.IFRIS ?= {}
TG.IFRIS.Routes ?= {}

class TG.IFRIS.GeneralDetailsForm extends TG.IFRIS.FormCore
	constructor: (@oVars)->
		@oVars.requiredIconLogic = false
		super

		@createInputs()
		@setupDatePickers()

		new TG.IFRIS.TractsSubMenu({id: @oVars.id, isDetails: true});

		# This form has no validation, but OH WELL!
		@setupValidators()
		@populateForm(@oData)

		@setupTooltips()
		@applyTooltipping()

		$("#saveButton").on("click touchstart", (e)=>
			@validate(e, true)
		)

	createInputs: ()=>
		nNameMax = 30
		nTaxMax = 150
		nLocMax = 125
		nMemoMax = 250

		aModels = [
			{
				inputID: "name"
				inputTitle: "Tract Name: "
				iconClass: "icon-info-sign"
				isTextArea: false
				rowCount: 0
				sizeClass: "span3"
				placeHolderText: "Tract Name"
				maxlength: nNameMax
				tooltip: "Enter a name for this tract (#{nNameMax} character limit)"
			}
			{
				inputID: "reportedAcres"
				inputTitle: "Reported Acres: "
				iconClass: "icon-move"
				sizeClass: "span2"
				placeHolderText: "Acres"
				tooltip: "Enter the reported acreage (must be a number, one decimal place allowed)"
			}
			{
				inputID: "taxPlatIds"
				inputTitle: "Tax Plat ID(s): "
				iconClass: "icon-tags"
				sizeClass: "span4"
				placeHolderText: "IDs"
				maxlength: nTaxMax
				tooltip: "Enter any Tax Plat IDs (#{nTaxMax} character limit)"
			}
			{
				inputID: "location"
				inputTitle: "Physical Location: "
				iconClass: "icon-globe"
				isTextArea: true
				rowCount: 4
				colCount: 80
				sizeClass: "span4"
				placeHolderText: "Location"
				maxlength: nLocMax
				tooltip: "Enter some information on the location (#{nLocMax} character limit)"
			}
			{
				inputID: "memo"
				inputTitle: "Comments: "
				iconClass: "icon-file"
				isTextArea: true
				rowCount: 4
				colCount: 80
				sizeClass: "span4"
				placeHolderText: "Comments"
				maxlength: nMemoMax
				tooltip: "Enter any additonal information (#{nMemoMax} character limit)"
			}
		]

		template = TG.HandlebarMe("#FormInput")

		for oM in aModels
			hField = template(oM)
			@$eForm.find("#contentArea").append(hField)
			@$eForm.find("##{oM.inputID}").tooltipster(@oTip)

	setupDatePickers: ()=>
		oProps =
			format: "mm-dd-yyyy"
			viewMode: "days"
			minViewMode: "days"
			autoclose: true
			endDate: new Date()

		$('.date-picker')
		.datepicker(oProps)

	populateForm: (oProps) =>
		for sProp of oProps
			$eField = @$eForm.find("##{sProp}")
			if $eField[0]?
				if (sProp.indexOf('Date') > -1 && oProps[sProp])
					$eField.val(TG.Methods.parseDate(oProps[sProp]).modDate.replace(/\//g, "-"))
				else
					$eField.val(oProps[sProp])

	setupValidatorRules: ()=>
		@oRules =
			reportedAcres:
				number: true
				oneDecimal: true

		return @oRules

	setupValidators: () =>
		$.validator.addMethod("oneDecimal",
			(value, element) =>
				bPass = true
				sTest = String(value)
				if sTest.has(".")
					aD = sTest.split(".")
					sDec = aD[1]
					if(sDec.length > 1)
						bPass = false

				return bPass
		, "Limit of one decimal place")

		super

	setupTooltips: ()->
		@aTips = [
# {id:"#formHelp", text:"Use this form to enter additional information for #{@oVars.id}.<br/>All fields are OPTIONAL."}
			{id: "#saveButton", text: "Click to save these details"}
		]

		$("#formHelp").tooltipster({
			content: $("<div>Use this form to enter additional information for #{@oVars.id}.</div><div>All fields are OPTIONAL.</div>")
			theme: @oTip.theme
		})

	submitSuccess: (data, status, headers, config)=>
		@acSavingNotice.detach()
		@bSaving = false
		$.jGrowl "Tract Details Updated.", {life: 4000}
# console.log "Update Details Success"
# console.log data
