/*
 * Used for sending files.
 */

// xshare
var xs = xs || {};


// file selector
xs.fileField = document.getElementById('sendFile');
// output 
xs.outputField = document.getElementById('selectedList');
// file to send
// TODO: just handle one file for now
xs.selectedFile = null;

/*
 * Update the description for files selected dynamically.
 */
xs.fileField.addEventListener('change', function(evt) {
    var files = evt.target.files;
    if (files.length === 0) {
        xs.outputField.innerHTML = "<ul><li>No file selected</li></ul>";
        return;
    }

    output = [];
    for (var idx = 0, size = files.length; idx < size; idx++) {
        f = files[idx];
        xs.selectedFile = {};
        // only the following properties are common
        properties = ['name', 'type', 'size', 'lastModifiedDate'];
        for (var i = 0, s = properties.length; i < s; i++) {
            var prop = properties[i];
            xs.selectedFile[prop] = f[prop];
        }

        results = "";
        // for (var k in f) {
        for (var k in xs.selectedFile) {
            results += (k + " : " + f[k]);
            results += "<br/>";
        }
        output.push('<li>' + results + '</li>');
    }
    xs.outputField.innerHTML = '<ul>' + output.join('') + "</ul>";
}, false);

xs.init = function() {
    var sendButton = document.getElementById('sendButton');
    sendButton.onclick = function() {
        alert("Clicked");
    };
};

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // All the File APIs are supported.
    xs.init();
} else {
    alert('The File APIs are not fully supported in this browser.');
}
