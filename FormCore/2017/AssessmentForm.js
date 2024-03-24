import Methods, {notNull, binder, getLongLat} from '../utils/Methods';
import Helpers, {tgAjax, getAssessmentRatingText} from '../utils/Helpers';
import FormCore from '../base/FormCore';
import SearchableDropDown from '../ui/SearchableDropDown';
import Pikaday from '../vendor/pikaday';
import CommunityModel from '../models/CommunityModel';
import PhotoUploader from '../utils/PhotoUploader';

class AssessmentForm extends FormCore
{
    constructor(oVars)
    {
        super(oVars);

        this._bPopulate = notNull(this._oData.AssessmentId) ? true :false;

        //BIND bind Bind BIND bind Bind
        binder([
            "createFDList", "setPageNav", "showPage",
            "createRatings", "nextPrevPage", "checkRatings",
            "checkPhotos", "uploadResults", "uploadError", "getScores",
            "displayCategoryScore", "tallyHazardClassScores", "incrementScore"
        ], this);

        this._oCommunity = new CommunityModel(this._oData);

        // create an array of select fieldNames
        this._aReqSelects = [];
        for(let cat of this._oCommunity._oProps.HazardCategoryList)
        {
            this._aReqSelects = this._aReqSelects.concat(cat.HazardClasses.filter(cl => cl.Type == 'lookup').map(cl => cl.Name));
        }

        this._acFDList = null;

        this._sPage = null;
        this._aPageIds = oVars.pages;
        this._sNoScoreText = "Cannot calculate Rating. Please complete all entries."

        let $eAssessDate = $("#AssessmentDate");
        if (notNull($eAssessDate[0]))
        {
            this._acAssessDate = new Pikaday({
        field:$eAssessDate[0],
        firstDay: 0, maxDate:new Date(),
        format: 'MM/DD/YYYY'
      });
            if (!this._bPopulate)
            {
                this._acAssessDate.setDate(new Date());
                $eAssessDate.parent().find(".req-icon").addClass("is-valid").removeClass("fa-asterisk").addClass("fa-check");
            }
        }

        this.createRatings();
        this.createFDList();
        this.setPageNav();
        this.prePopulateLogic();
        this.initPhotoUploader();
        this.setupValidators();

        let sLL = $("#lat-long-text").text();
        let sFinal = Methods.getLongLat(sLL);
        $("#lat-long-text").text(sFinal);

        $("#submit-button").on("click touchstart",
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.validate(e, true);
            }
        );

        if (this._bPopulate)
        {
            this.validate();
            let sTab = window.location.hash;
            sTab = sTab.has("#") ? sTab.replace("#", "") : null;
            if (sTab)
            {
                this.showPage(sTab);
            }
        }
    }

    initPhotoUploader(){
        const oInit = {
            id:"photoFiles",
            maxUpload:3,
            rowBreaks:{0:true},
            fetchUrl:this._bPopulate ? tg.ca.routes.getPhotos : null,
            deleteUrl:this._bPopulate ? tg.ca.routes.deletePhotos : null,
            maximumImageSize:tg.ca.maximumImageSize && tg.ca.maximumImageSize > 0 ? tg.ca.maximumImageSize : null
        }
        console.log("Init Photo", oInit)
        this._acPhotos = new PhotoUploader(oInit);
    }

    checkPhotos(){
        let aPhotos = this._acPhotos.images;
        let acFormData = new FormData();
        for(let oFile of aPhotos)
        {
            acFormData.append("photoFiles", oFile);
        }

        let oParams = {
            processData:false,
            contentType:false,
            queryString:acFormData,
            wrapData:true
        }
        tgAjax(tg.ca.routes.addPhotos, this.uploadResults, this.uploadError, true, false, false, false, oParams);
    }

    uploadError(oResults) {
        console.log("uploadError", oResults);
        let sRT = `Error uploading images.<br>`;
        try
        {
            const oRT = JSON.parse(oResults.responseText);
            if (notNull(oRT) && oRT.hasOwnProperty("ServerErrors"))
            {
                console.log("oRT");
                console.log(oRT);
                for (let sProp of oRT.ServerErrors)
                {
                    sRT += `<br>${sProp}`;
                }
            }
        }
        catch(e){};

        // Methods.yay(`Assessment was saved successfully.`);
        sessionStorage.setItem('sayWhat', `Assessment was saved successfully.`);
        // Methods.grr(sRT);
        sessionStorage.setItem('grrWhat', sRT);

        window.history.replaceState(null, null, tg.ca.routes.assessmentFormPhotos);
        window.location.reload();

        //Need to reset the form submit status because the user could fix their image and/or
        //make changes to the assessment fields.
        // this._bSaving = false;
        // this._bSubmitted = false;
        // this._acNotice.detach();
    }

    uploadResults(oResults){
        let sRT = `Assessment was saved successfully.`;
        if (notNull(oResults) && notNull(oResults.data))
        {
            sRT += `<br>${oResults.data.message}`;
        }
        sessionStorage.setItem('sayWhat', sRT);
        window.open(Helpers.projectUrl("communityDetails", this._oCommunity.projectId, {communityHere:this._oCommunity.id}), "_self");
    }

    prePopulateLogic(){
        if (this._bPopulate)
        {
            this._oData.OneWayInOut = this._oData.OneWayInOut === "True" ? "Yes" : "No";
            this.populateForm(this._oData);
        }
    }

    populateForm(oPop){
        super.populateForm(oPop)

        this._acFDList.setSelected(oPop.FireProtectionDistrictId);
        this._acAssessDate.setDate(oPop.AssessmentDate);
    }

    createRatings() {
        const eEnv = document.getElementById("environmental-score");
        const eCon = document.getElementById("construction-score");
        const eTotal = document.getElementById("total-score");

        const $eEnvLabel = $(document.createElement("div")).addClass("score-title").text("Surrounding Environment:");
        this._$eEnvScore = $(document.createElement("div")).addClass("score-text");
        $(eEnv).append($eEnvLabel).append(this._$eEnvScore);

        const $eConLabel = $(document.createElement("div")).addClass("score-title").text("Home Construction:");
        this._$eConScore = $(document.createElement("div")).addClass("score-text");
        $(eCon).append($eConLabel).append(this._$eConScore);

        const $eTotalLabel = $(document.createElement("div")).addClass("score-title").text("Total Hazard Rating:");
        this._$eTotal = $(document.createElement("div")).addClass("score-text");
        $(eTotal).append($eTotalLabel).append(this._$eTotal);
    }

    setPageNav() {
        this._$eNav = $("#form-navigation");
        if(notNull(this._$eNav) && notNull(this._$eNav[0]))
        {
            this._oNav = {};
            this._sPage = this._aPageIds[0];
            for(let [nI, sId] of this._aPageIds.entries())
            {
                this._oNav[sId] =
                {
                    index:nI,
                    item:this._$eNav.find(`#${sId}`),
                    page:$(`#${sId}Fields`)
                }

                this._oNav[sId].item.on("click touchstart", (e)=>{
                    if (sId !== this._sPage)
                    {
                        this.showPage(sId)
                    }
                })
            }

            this._$ePrev = Helpers.iconButton("page-button", tg.ca.icons.previous, "Back");
            $("#prev-button").append(this._$ePrev);

            this._$ePrev.on("click touchstart", (e)=>{
                if (this._oNav[this._sPage].index > 0)
                {
                    this.nextPrevPage(true);
                }
            })

            if (this._oNav[this._sPage].index < this._aPageIds.length - 1) {
              this._$eNext = Helpers.iconButton("page-button", tg.ca.icons.next, "Next", null, null, {flip:true});
              $("#next-button").append(this._$eNext);

              this._$eNext.on("click touchstart", (e)=>{
                if (this._oNav[this._sPage].index < this._aPageIds.length - 1)
                {
                  this.nextPrevPage(false);
                }
              })
            }

            this.setButtonStates();
        }
    }

    nextPrevPage(bPrev = false){
        const oPage = this._oNav[this._sPage];
    console.log(oPage);
        const nI = bPrev ? Math.max(oPage.index - 1, 0) : Math.min(oPage.index + 1,this._aPageIds.length - 1);
    console.log(this._aPageIds[nI]);
        this.showPage(this._aPageIds[nI]);
    }

    showPage(sId) {
        if (notNull(sId) && sId.has("Fields"))
        {
            sId = sId.replace("Fields", "");
        }

        if (notNull(sId) && sId !== this._sPage)
        {
            const oPrev = this._oNav[this._sPage];
            oPrev.page.removeClass("active-page");
            oPrev.item.removeClass("selected");

            const oPage = this._oNav[sId];
            oPage.page.addClass("active-page");
            oPage.item.addClass("selected");

            this._sPage = sId;

            this.setButtonStates();

            if(sId === "ratings")
            {
                this.checkRatings();
            }
        }
    }

    setButtonStates() {
        const oPage = this._oNav[this._sPage];
        if (oPage.index < this._aPageIds.length - 1)
        {
            this._$eNext.show();
        }
        else
        {
            this._$eNext.hide();
        }

        if (oPage.index === 0)
        {
            this._$ePrev.addClass("disabled");
        }
        else
        {
            this._$ePrev.removeClass("disabled");
        }
    }

    setupValidatorRules() {
        this._oRules =
        {
            NumberOfHomes:
            {
                required:true,
                wholeNumbersOnly:true,
                greaterThanZero:true
            },
            AssessmentDate:
            {
                required:true,
                isDate:true
            }
        }

        const oReq =
        {
            required:true,
            notNull:true
        }

        for (let sId of this._aReqSelects)
        {
            this._oRules[sId] = oReq;
        }
    }

    setupValidatorMessages() {
        //populate validation error messages by field with data coming from DB instead of hardcoding it
        this._oCommunity._oProps.HazardCategoryList.flatMap((category) => {
            return category.HazardClasses.map((hazardClass) => {
              return this._oMessages[hazardClass.Name] = {
                    required:`<b>${hazardClass.Description}</b> is a required field`,
                    notNull:`A value for <b>${hazardClass.Description}</b> must be selected`
                }
            });
        });
    }

    setValidateHelpers() {
        super.setValidateHelpers();

        // Check the number of invalids. If > 0 scroll to the first invalid field
        this._fInvalid = (form, validator)=> {
            if (this._bChecking && validator.numberOfInvalids()) {
                let oFirst = validator.errorList[0];
                let sErrors = ""
                let sFirstId = null;
                for (let sId in validator.errorMap)
                {
                    sErrors += `${validator.errorMap[sId]}<br>`
                    if (!notNull(sFirstId))
                    {
                        sFirstId = sId;
                    }
                }
                Methods.grr(sErrors, undefined, {title:"Please provide the required details and then resubmit the Assessment.", positionClass:"toast-top-full-width"})
                const aSections = $(".form-section")
                let sPageId = null;
                for(let eSect of aSections)
                {
                    const eGot = eSect.querySelector(`#${sFirstId}`);
                    if (notNull(eGot))
                    {
                        sPageId = eSect.id;
                        break;
                    }
                }
                if (notNull(sPageId))
                {
                    this.showPage(sPageId);
                }
                let nTop = $(oFirst.element).offset().top;
                return $('html, body').animate({
                    scrollTop: $(oFirst.element).offset().top
                }, 500);
            }
        };
    }

    createFDList() {
        const sId = "FireProtectionDistrictId";
        let $eSelect = $(`#${sId}`);
        let bSelect = notNull($eSelect) && notNull($eSelect[0]) ? true :false;

        if (bSelect && notNull(tg.ca.fireDeptsSorted))
        {
            const aFire = [];

            for (let sId of tg.ca.fireDeptsSorted) {
                aFire.push({ id: sId.Key, label: sId.Value });
            }

            const oInit =
            {
                id:sId,
                items:aFire,
                element:$eSelect,
                selected:this.searchableItemSelected,
                selectionText:" * Select District (type at least 2 characters to filter) * "
            }
            this._acFDList = new SearchableDropDown(oInit);
        }
        else
        {
            Rollbar.critical(`${this._bPopulate ? "Update" : "Create new"} Assessment: Fire Protection District list is empty / missing`)
        }
    }

    checkRatings(){
        let oJSON = this.getStuff(true);
    this.getScores(oJSON);
    const scoredCategories = this._oCommunity._oProps.HazardCategoryList.filter(cat => cat['TotalsFlag'] === false);
    const totalsCategory = this._oCommunity._oProps.HazardCategoryList.filter(cat => cat['TotalsFlag'] === true)[0];
    $("#assessment-scores").empty();
    let allCategoriesValid = true;
    const showTotalScore = true;
    // go through the categories to add ratings to the page
    for (const cat of scoredCategories) {
      if (notNull(oJSON[cat.ScoreField])) {
          const ratingText = getAssessmentRatingText(oJSON[cat.ScoreField], cat.ScoreRanges, !showTotalScore);
          this.displayCategoryScore(cat, ratingText.text, ratingText.cssClass);
      }
      else {
        allCategoriesValid = false;
        this.displayCategoryScore(cat, this._sNoScoreText)
      }
    }
    // add total category to the page
    if (allCategoriesValid) {
        const ratingText =
            getAssessmentRatingText(oJSON[totalsCategory.ScoreField], totalsCategory.ScoreRanges, showTotalScore);
      this.displayCategoryScore(totalsCategory, ratingText.text, ratingText.cssClass);
    }
    else {
      this.displayCategoryScore(totalsCategory, this._sNoScoreText)
    }
    }

  tallyHazardClassScores(category, oJSON) {
    for (const hazardClass of category.HazardClasses) {
      const selectedCondition = hazardClass.HazardConditions.find(condition => condition.Name == oJSON[hazardClass.Name] )
      if (selectedCondition) {
        oJSON[category.ScoreField] = this.incrementScore(oJSON[category.ScoreField], selectedCondition.Score);
      }
      else {
        oJSON[category.ScoreField] = null;
        // a condition should be selected for each class.  If not, it is invalid
        return false;
      }
    }
    return true;
  }

  // generic method to add the category score to the page
  displayCategoryScore(category, text, cssClass='') {

    let html = $("<div class='score-tally'>")
        .append(`<div class='score-title'>${category.ScoreLabel}:</div>`)
        .append(`<div><span class='score-text ${cssClass}'></span>${text}</div>`);

      if (text === this._sNoScoreText) {
          html = $("<div class='score-tally'>")
          .append(`<div class='score-title'>${category.ScoreLabel}:</div>`)
          .append(`<div style='color:red;'>${text}</div>`);
      }

    $("#assessment-scores").append(html);
  }

  // generic function to increment or set the value
  incrementScore(totalScore, incrementValue){
    if (totalScore) {
      totalScore += incrementValue;
    }
    else {
      totalScore = incrementValue;
    }
    return totalScore;
  }

    // Do a validation pass before attempting to pass the buck
    validate(e, bSubmit) {
        this._bChecking = true;
        const bPassed = this._$eForm.valid();
        const bFireDistrict = this._acFDList.value !== null ? true : false;

        const sId = "FireProtectionDistrictId"
        let $eSelect = $(`#${sId}`);
        if (bFireDistrict)
        {
            this.searchableItemSelected(sId);
        }
        else
        {
            $eSelect.parent().append(`<label id="${sId}-error" class="error" for="${sId}">A <b>Fire Protection District</b> must be selected</label>`)
            this._fInputError($eSelect)
        }

        this._bChecking = false;

        if (bSubmit && bPassed && bFireDistrict)
        {
            let oJSON = this.getStuff(true);
            oJSON.FireProtectionDistrictId = this._acFDList.value;

            this.getScores(oJSON)

            const sJSON = JSON.stringify(oJSON);

            this.attemptSubmit(sJSON);
        }
        else
        {
            if(!bFireDistrict)
            {
                const sErrTitle = bPassed ? `Please provide the required details and then resubmit the Assessment.` : ``;
                Methods.grr("You must select a <b>Fire Protection District</b>.", undefined, {title:sErrTitle, positionClass:"toast-top-full-width"})
                this.showPage("community")
            }
        }
    }

    getScores(oValues){
    const scoredCategories = this._oCommunity._oProps.HazardCategoryList.filter(cat => cat['TotalsFlag'] === false)
    const totalsCategory = this._oCommunity._oProps.HazardCategoryList.filter(cat => cat['TotalsFlag'] === true)[0]
    $("#assessment-scores").empty();
    let allCategoriesValid = true;
    let totalScore = 0;
    for (const cat of scoredCategories) {
      if (this.tallyHazardClassScores(cat, oValues)) {
        if (allCategoriesValid){
          totalScore = this.incrementScore(totalScore, oValues[cat.ScoreField]);
        }
      }
      else {
        allCategoriesValid = false;
      }
    }
    if (allCategoriesValid){
      oValues[totalsCategory.ScoreField] = totalScore;
    }
    }

    getSubmitUrl() {
        return tg.ca.routes.saveAssessment;
    }

    submitSuccess(data, status, headers, config) {
        if (notNull(data) && data.hasOwnProperty("success"))
        {
            let bSuccess = Boolean(data.success);

            if (bSuccess)
            {
                this._bSubmitted = true;
                this._bSaving = false;
                this.killAlert();

                Rollbar.info(`Assessment was saved successfully.`);
                if (this._acPhotos.images.length)
                {
                    console.log("Saved / edited assessment", data)
                    this._acNotice.setMessage(`Now Uploading images. ${this._acPhotos.images.length} in total.`)
                    tg.ca.routes.addPhotos = tg.ca.routes.addPhotos.replace("assessmentHere", data.assessmentId);
                    tg.ca.routes.assessmentFormPhotos = Helpers.projectUrl("assessmentFormPhotos", this._oCommunity.projectId, {communityHere:this._oCommunity.id, assessmentHere:data.assessmentId})
                    this.checkPhotos();
                }
                else
                {
                    sessionStorage.setItem('sayWhat', `Assessment was saved successfully.`);
                    window.open(Helpers.projectUrl("communityDetails", this._oCommunity.projectId, {communityHere:this._oCommunity.id}), "_self")
                }
            }
            else
            {
                let sErrors = `Error saving assessment.`;
                Methods.grr(sErrors, undefined, {title:"Error", positionClass:"toast-top-full-width"});

                this._acNotice.detach();
                this._bSaving = false;
                this._bSubmitted = false;
            }
        }
        else
        {
            Rollbar.critical(`Unknown error ${this._bPopulate ? "updating" : "creating new"} assessment. No data returned.`);
            Methods.grr(`Unknown error ${this._bPopulate ? "updating" : "creating new"} assessment`);

            this._acNotice.detach();
            this._bSaving = false;
            this._bSubmitted = false;
        }
    }

    attemptErrorParse(sText) {
        let sR = sText;
        try {
            let oR = JSON.parse(sText);
            if (notNull(oR) && oR.hasOwnProperty("ServerErrors"))
            {
                sR = `Error ${this._bPopulate ? "updating" : "creating new"} assessment.`;
                for (let sProp of oR.ServerErrors)
                {
                    sR += `<br>${sProp}`
                }
            }
        }
        catch (e)
        {
          sR = sText;
        }

        return sR;
    }
}
export default AssessmentForm
