$(function () {
  "use strict";
  const tidy = require('htmltidy2').tidy,
      fs = require('fs');
  const uploadController = {};
  uploadController.dayNumber = '';
  uploadController.dayInteger = '';
  uploadController.destinationDirectory = '';

  // reads file. Sets dayNumber for element tracking.
  uploadController.readFileInput = function (inputElement, callback) {
    if (inputElement) {
      uploadController.dayNumber = inputElement.parent()[0].getAttribute('data-day');
      uploadController.dayInteger = inputElement.parent()[0].getAttribute('data-int');
      const file = inputElement[0].files[0];
      const reader = new FileReader();
      reader.onload = function (loadEvent) {
        const arrayBuffer = loadEvent.target.result;
        callback(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // populates daily objects
  uploadController.outputResult = function (result) {
    const num = uploadController.dayNumber;
    const int = uploadController.dayInteger;
    const body = `chapterBody${num}`;
    const audio = `audioChap${num}Link`;

    dynamic[body] = result.value;
    dynamic[audio] = audioLinkSanitize($(`#chapter${int}AudioBook`).val().trim());

    if (parseInt(uploadController.dayInteger, 10) < 5) {
      const nextFile = parseInt(uploadController.dayInteger, 10) + 1;
      uploadController.readFileInput($(`#chapter${nextFile}FileInput`), uploadController.converter);
    } else {
      console.log(dynamic);
      console.log(consistent);
    }
    exposeBuildWrite();
  };

  // converts doc.x to html
  var options = {
    styleMap: [
        "u => em"
    ]
  };
  uploadController.converter = function (arrayBuffer) {
    mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options)
          .then(uploadController.outputResult)
          .done();
  };
  // verifies that the chosen file is a docx file
  uploadController.docxVerifier = function (fileName) {
    const extension = fileName.split('.')[1];
    if (extension === 'docx') return true;
  };
  // verifies that entry is 10 characters long
  uploadController.isbnVerifier = function (el) {
    if (el.attr('id') === 'isbnInput') {
      return (el.val().length >= 10);
    } else {
      return true;
    }
  };
  // emphasizes the title wherever it is found in the intro.
  uploadController.introFormatter = function (title, originalString) {
    const italicized = '<em>' + title + '</em>';
    const newString = originalString.split(title).join(italicized);
    const output = newString.trim().replace(/\n/g,'<br>').concat('<br>');
    return output;
  };

  // enables the submit button if all requird fields are populated
  uploadController.submitEnable = function () {
    // checks author title and isbn fields
    const formChecker = function (el) {
      return ($(el).val() !== '');
    };

    const fileChecker = function (el) {
      return uploadController.docxVerifier($(el).val());
    };

    const requiredForm = function () {
      const formArray = $('.required-form').toArray()
      .every(formChecker);
      return (formArray);
    };
    // checks docx fields
    const requiredDocx = function () {
      const docxArray = $('.form-file').toArray()
      .every(fileChecker);
      return (docxArray);
    };
    // enables submit button
    if (requiredForm() && requiredDocx()) {
      $('#downloadTo').prop('disabled', false);
    } else {
      $('#downloadTo').prop('disabled', true);
    }
  };
  // Trigger initial file read on submit.
  $(document).ready(function() {
    $('#downloadTo').on('change', function () {
      const downloadDir = $(this).val();
      $('.last-label').text('Processing ...');
      uploadController.destinationDirectory = downloadDir;
      uploadController.readFileInput($('#chapter1FileInput'), uploadController.converter);
      consistent.isbn = $('#isbnInput').val();
      consistent.author = $('#authorInput').val();
      consistent.title = $('#bookTitle').val();
      consistent.intro = uploadController.introFormatter(consistent.title, $('#emailIntroInput').val());
      consistent.copyrightYear = $('#copyright-year').val();
      consistent.copyrightHolder = $('#copyright-holder').val();
      consistent.bannerImgLink = $('#bannerImg').val();
      consistent.bannerHrefLink = $('#bannerHref').val();
      consistent.bannerDescription = $('#bannerDesc').val();
    });
    // Calls enable function after data entry in title, author, and ISBN field
    $('.required-form').on('keyup', function () {
      console.log('val', $(this).val());
      uploadController.submitEnable();
    });
    // verifies correct file type for docx fields
    $('.form-file').on('change', function () {
      console.log('val', $(this).val());
      uploadController.submitEnable();
    });
  });

  function audioLinkSanitize(url) {
    if (!url) return;
    if (url.startsWith('http')) return url;
    url = 'https://' + url;
    return url;
  }

  function exposeBuildWrite() {
    const template1 = dayOneCompile(consistent, dynamic),
          template1Web = dayOneWebCompile(consistent, dynamic),
          template2 = dayTwoCompile(consistent, dynamic),
          template2Web = dayTwoWebCompile(consistent, dynamic),
          template3 = dayThreeCompile(consistent, dynamic),
          template3Web = dayThreeWebCompile(consistent, dynamic),
          template4 = dayFourCompile(consistent, dynamic),
          template4Web = dayFourWebCompile(consistent, dynamic),
          template5 = dayFiveCompile(consistent, dynamic);

    const templates = [template1, template2,
                     template3, template4,
                     template5, template1Web,
                     template2Web, template3Web,
                     template4Web,
                    ];
    templates.forEach( function(currentTemplate, idx) {
      let html = '';
      // this concatenated mess sets up a nice dynamic file name for fs.writeFile:
      if (idx < 5) {
        var fileName = 'First5_' + consistent.title.replace(/\s/g, '') + '_Chapter' + (idx+1)  + '.html';
      } else {
        var fileName = 'first5_' + consistent.title.replace(/\s/g, '').toLowerCase() + '_' + currentTemplate.name + '.html';
      }
      // add directory path to file name:
      fileName = uploadController.destinationDirectory + '/' + fileName;

      // the true build compiling begins here:
      if (idx < 5) {
        for (var props in currentTemplate) {
        // since adding a name property for the new file only, do not include that in the html:
          if(props !== 'name' && props !== 'webTrackHeader' && props !== 'webTrackFooter') {
            html += currentTemplate[props];
          }
        }
      } else {
        for (var props in currentTemplate) {
          if(props !== 'name') {
            html += currentTemplate[props];
          }
        }
      }
      // clean up the structure of the html so it isn't all on one line:
      tidy(html, function(err, htmlTidy) {
        if (err) throw err;
        fs.writeFile(fileName, htmlTidy, function () {
          if (err) throw err;
          $('.last-label').text('Success!');
        });
      });
    });
  }
});
