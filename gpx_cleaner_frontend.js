// GPX Cleaner Frontend JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const status = document.getElementById('status');

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Click to upload
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    function handleFile(file) {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            showStatus('Please select a valid GPX file.', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showStatus('File size must be less than 10MB.', 'error');
            return;
        }

        showStatus('Processing GPX file...', 'info');
        progress.style.display = 'block';
        progressBar.style.width = '0%';

        // Create FormData
        const formData = new FormData();
        formData.append('gpxFile', file);

        // Default settings
        const settings = {
            removeSpeedOutliers: true,
            maxSpeed: 200, // km/h
            smoothingFactor: 3,
            removeElevationNoise: true,
            optimizeForStrava: true,
            removeDuplicatePoints: true
        };
        formData.append('settings', JSON.stringify(settings));

        // Upload file
        uploadFile(formData);
    }

    function uploadFile(formData) {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
            }
        });

        xhr.addEventListener('load', function() {
            progress.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        downloadProcessedFile(response.data, response.stats);
                    } else {
                        showStatus('Error: ' + response.error, 'error');
                    }
                } catch (e) {
                    showStatus('Error processing response.', 'error');
                }
            } else {
                showStatus('Upload failed. Please try again.', 'error');
            }
        });

        xhr.addEventListener('error', function() {
            progress.style.display = 'none';
            showStatus('Network error. Please check your connection.', 'error');
        });

        xhr.open('POST', '/api/process-gpx');
        xhr.send(formData);
    }

    function downloadProcessedFile(xmlData, stats) {
        // Create blob and download link
        const blob = new Blob([xmlData], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'cleaned-track.gpx';
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(url);

        // Show success message with stats
        const statsMessage = `
            ✅ File processed successfully!<br>
            📊 Statistics:<br>
            • Original points: ${stats.originalPoints}<br>
            • Cleaned points: ${stats.cleanedPoints}<br>
            • Removed points: ${stats.removedPoints}<br>
            • Total distance: ${stats.distance} km<br>
            📥 File downloaded as 'cleaned-track.gpx'
        `;
        showStatus(statsMessage, 'success');
    }

    function showStatus(message, type) {
        status.innerHTML = message;
        status.className = 'status ' + type;
        status.style.display = 'block';
        
        // Auto-hide success messages after 10 seconds
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 10000);
        }
    }

    // Add some interactive features
    uploadArea.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
    });

    uploadArea.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });

    // Add keyboard support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === uploadArea) {
            fileInput.click();
        }
    });
});