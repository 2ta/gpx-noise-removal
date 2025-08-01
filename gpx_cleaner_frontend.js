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
            showStatus('❌ Please select a valid GPX file. Only .gpx files are supported.', 'error');
            return;
        }

        // Show file info
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showStatus(`📁 File selected: ${file.name} (${fileSizeMB} MB)<br>🔄 Processing GPX file...`, 'info');
        
        // Show progress bar
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

        // Upload file with enhanced progress tracking
        uploadFile(formData, file.name);
    }

    function uploadFile(formData, fileName) {
        const xhr = new XMLHttpRequest();

        // Upload progress
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                
                // Update status with progress
                const uploadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
                const totalMB = (e.total / (1024 * 1024)).toFixed(2);
                showStatus(`📤 Uploading: ${uploadedMB}MB / ${totalMB}MB (${Math.round(percentComplete)}%)`, 'info');
            }
        });

        // Processing progress simulation
        xhr.upload.addEventListener('load', function() {
            showStatus('✅ Upload complete! 🔄 Processing GPX data...', 'info');
            progressBar.style.width = '100%';
            
            // Simulate processing time
            setTimeout(() => {
                progressBar.style.width = '100%';
            }, 500);
        });

        xhr.addEventListener('load', function() {
            progress.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        downloadProcessedFile(response.data, response.stats, fileName);
                    } else {
                        showStatus(`❌ Processing Error: ${response.error}`, 'error');
                    }
                } catch (e) {
                    showStatus('❌ Error: Invalid response from server. Please try again.', 'error');
                    console.error('Response parsing error:', e);
                }
            } else if (xhr.status === 413) {
                showStatus('❌ Error: File too large for processing. Please try a smaller file.', 'error');
            } else if (xhr.status === 429) {
                showStatus('❌ Error: Too many requests. Please wait a moment and try again.', 'error');
            } else if (xhr.status >= 500) {
                showStatus('❌ Error: Server is temporarily unavailable. Please try again later.', 'error');
            } else {
                showStatus(`❌ Upload failed (Status: ${xhr.status}). Please check your connection and try again.`, 'error');
            }
        });

        xhr.addEventListener('error', function() {
            progress.style.display = 'none';
            showStatus('❌ Network error. Please check your internet connection and try again.', 'error');
        });

        xhr.addEventListener('timeout', function() {
            progress.style.display = 'none';
            showStatus('❌ Request timeout. The file might be too large or the server is busy. Please try again.', 'error');
        });

        // Set timeout to 5 minutes for large files
        xhr.timeout = 300000; // 5 minutes

        xhr.open('POST', '/api/process-gpx');
        xhr.send(formData);
    }

    function downloadProcessedFile(xmlData, stats, originalFileName) {
        // Create blob and download link
        const blob = new Blob([xmlData], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        
        // Generate cleaned filename
        const baseName = originalFileName.replace('.gpx', '');
        const cleanedFileName = `${baseName}_cleaned.gpx`;
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = cleanedFileName;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(url);

        // Show success message with detailed stats
        const statsMessage = `
            ✅ <strong>File processed successfully!</strong><br><br>
            📊 <strong>Processing Statistics:</strong><br>
            • 📍 Original GPS points: ${stats.originalPoints.toLocaleString()}<br>
            • 🧹 Cleaned GPS points: ${stats.cleanedPoints.toLocaleString()}<br>
            • 🗑️ Removed noise points: ${stats.removedPoints.toLocaleString()}<br>
            • 📏 Total distance: ${stats.distance} km<br>
            • 📉 Noise reduction: ${Math.round((stats.removedPoints / stats.originalPoints) * 100)}%<br><br>
            📥 <strong>Downloaded as:</strong> ${cleanedFileName}<br><br>
            🎯 <em>Your GPX file is now optimized for Strava upload!</em>
        `;
        showStatus(statsMessage, 'success');
    }

    function showStatus(message, type) {
        status.innerHTML = message;
        status.className = 'status ' + type;
        status.style.display = 'block';
        
        // Auto-hide success messages after 15 seconds
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 15000);
        }
        
        // Auto-hide info messages after 8 seconds
        if (type === 'info' && message.includes('Processing GPX data')) {
            setTimeout(() => {
                if (status.innerHTML.includes('Processing GPX data')) {
                    status.style.display = 'none';
                }
            }, 8000);
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

    // Add file size display on hover
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
        
        // Show file info if files are being dragged
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            uploadArea.querySelector('.upload-text').textContent = 
                `Drop "${file.name}" (${fileSizeMB} MB) to upload`;
        }
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        uploadArea.querySelector('.upload-text').textContent = 
            'Drop your GPX file here or click to browse';
    });
});