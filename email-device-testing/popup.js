
document.getElementById("fileInput").addEventListener("change", function () {
    var file = this.files[0];
    var reader = new FileReader();

    reader.onload = function (event) {
        var zip = new JSZip();
        zip.loadAsync(event.target.result).then(function (zip) {
            var htmlFiles = [];
            var images = {};

            // Collect HTML and image files from zip
            zip.forEach(function (relativePath, zipEntry) {
                if (zipEntry.name.endsWith(".html")) {
                    htmlFiles.push(zipEntry.name);
                } else if (/\.(png|jpe?g|gif|svg)$/i.test(zipEntry.name)) {
                    images[zipEntry.name] = zipEntry;
                }
            });

            // First, load all images as base64
            var imagePromises = Object.keys(images).map(function (imageName) {
                return images[imageName]
                    .async("base64")
                    .then(function (base64) {
                        images[imageName].base64 = base64;
                    });
            });

            Promise.all(imagePromises).then(function () {
                // Render HTML files with updated image references
                htmlFiles.forEach(function (htmlFileName) {
                    zip.file(htmlFileName)
                        .async("string")
                        .then(function (data) {
                            // Replace image file paths with base64 data
                            Object.keys(images).forEach(function (imageName) {
                                var imgRegex = new RegExp(imageName, "g");
                                var base64Data =
                                    "data:image/" +
                                    getImageType(imageName) +
                                    ";base64," +
                                    images[imageName].base64;
                                data = data.replace(imgRegex, base64Data);
                            });

                            // Open a new tab and pass the content
                            var newTab = window.open();
                            newTab.document.write(`
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Template Preview</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    grid-gap: 20px;
                    padding: 20px;
                  }
                  iframe {
                    width: 100%;
                    border: none;
                  }
                  .device-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                  }
                  .device-label {
                    font-weight: bold;
                    margin-bottom: 10px;
                  }
                  .preview-desktop { width: 700px; height: 100vh; }
                  .preview-tablet { width: 599px; height: 100vh; }
                  .preview-medium-mobile { width: 475px; height: 100vh; }
                  .preview-small-mobile { width: 320px; height: 100vh; }
                </style>
              </head>
              <body>
                <div class="device-container">
                  <div class="device-label">Desktop</div>
                  <iframe class="preview-desktop" srcdoc="${data}"></iframe>
                </div>
                <div class="device-container">
                  <div class="device-label">Tablet</div>
                  <iframe class="preview-tablet" srcdoc="${data}"></iframe>
                </div>
                <div class="device-container">
                  <div class="device-label">Medium Mobile</div>
                  <iframe class="preview-medium-mobile" srcdoc="${data}"></iframe>
                </div>
                <div class="device-container">
                  <div class="device-label">Small Mobile</div>
                  <iframe class="preview-small-mobile" srcdoc="${data}"></iframe>
                </div>
              </body>
              </html>
            `);
                            newTab.document.close();
                        });
                });
            });

            // Helper function to get image MIME type
            function getImageType(fileName) {
                var ext = fileName.split(".").pop().toLowerCase();
                return ext === "jpg" ? "jpeg" : ext;
            }
        });
    };

    reader.readAsArrayBuffer(file);
});
