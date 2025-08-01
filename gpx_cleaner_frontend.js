<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPX Cleaner - Remove Noise for Strava</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            backdrop-filter: blur(10px);
        }

        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
            font-weight: 300;
        }

        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 40px;
            font-size: 1.1em;
        }

        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            margin-bottom: 30px;
            transition: all 0.3s ease;
            cursor: pointer;
            background: linear-gradient(45deg, #f8f9ff, #f0f2ff);
        }

        .upload-area:hover {
            border-color: #764ba2;
            background: linear-gradient(45deg, #f0f2ff, #e8ebff);
            transform: translateY(-2px);
        }

        .upload-area.dragover {
            border-color: #28a745;
            background: linear-gradient(45deg, #f0fff4, #e6ffed);
        }

        .upload-icon {
            font-size: 3em;
            color: #667eea;
            margin-bottom: 20px;
        }

        .upload-text {
            font-size: 1.2em;
            color: #555;
            margin-bottom: 15px;
        }

        .upload-hint {
            color: #888;
            font-size: 0.9em;
        }

        #fileInput {
            display: none;
        }

        .settings {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .settings h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.3em;
        }

        .setting-group {
            margin-bottom: 20px;
        }

        .setting-group label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }

        .setting-group input,
        .setting-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
            transition: border-color 0.3s ease;
        }

        .setting-group input:focus,
        .setting-group select:focus {
            outline: none;
            border-color: #667eea;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .checkbox-group input[type="checkbox"] {
            width: auto;
            transform: scale(1.2);
        }

        .process-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 20px;
        }

        .process-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .process-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .results {
            display: none;
            background: #e8f5e8;
            border-radius: 15px;
            padding: 25px;
            margin-top: 20px;
        }

        .results h3 {
            color: #28a745;
            margin-bottom: 15px;
        }

        .download-btn {
            background: #28a745;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .download-btn:hover {
            background: #218838;
            transform: translateY(-1px);
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            display: none;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .stat-value {
            font-size: 1.5em;
            font-weight: 600;
            color: #667eea;
        }

        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }

        @media (max-width: 768px) {
            .container {
                padding: 25px;
                margin: 10px;
            }
            
            h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>GPX Cleaner</h1>
        <p class="subtitle">Remove noise from your GPS tracks for perfect Strava uploads</p>

        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📁</div>
            <div class="upload-text">Drop your GPX file here or click to browse</div>
            <div class="upload-hint">Supports .gpx files up to 10MB</div>
            <input type="file" id="fileInput" accept=".gpx" />
        </div>

        <div class="settings">
            <h3>Noise Removal Settings</h3>
            
            <div class="setting-group">
                <label for="activityType">Activity Type:</label>
                <select id="activityType">
                    <option value="running">Running</option>
                    <option value="cycling">Cycling</option>
                    <option value="walking">Walking</option>
                    <option value="hiking">Hiking</option>
                    <option value="driving">Driving</option>
                </select>
            </div>

            <div class="setting-group">
                <label for="maxSpeed">Maximum Speed (km/h):</label>
                <input type="number" id="maxSpeed" value="50" min="1" max="200" />
            </div>

            <div class="setting-group">
                <label for="smoothingFactor">Smoothing Factor (1-10):</label>
                <input type="range" id="smoothingFactor" min="1" max="10" value="3" />
                <span id="smoothingValue">3</span>
            </div>

            <div class="setting-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="removeElevationNoise" checked />
                    <label for="removeElevationNoise">Fix elevation data</label>
                </div>
            </div>

            <div class="setting-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="removeDuplicates" checked />
                    <label for="removeDuplicates">Remove duplicate points</label>
                </div>
            </div>

            <div class="setting-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="optimizeForStrava" checked />
                    <label for="optimizeForStrava">Optimize for Strava compatibility</label>
                </div>
            </div>
        </div>

        <button class="process-btn" id="processBtn" disabled>
            Select a GPX file to clean
        </button>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing your GPX file...</p>
        </div>

        <div class="error" id="error"></div>

        <div class="results" id="results">
            <h3>✅ GPX file cleaned successfully!</h3>
            <div class="stats" id="stats"></div>
            <button class="download-btn" id="downloadBtn">
                Download Cleaned GPX
            </button>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const processBtn = document.getElementById('processBtn');
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');
        const error = document.getElementById('error');
        const smoothingFactor = document.getElementById('smoothingFactor');
        const smoothingValue = document.getElementById('smoothingValue');
        const downloadBtn = document.getElementById('downloadBtn');
        
        let selectedFile = null;
        let processedData = null;

        // Update smoothing factor display
        smoothingFactor.addEventListener('input', (e) => {
            smoothingValue.textContent = e.target.value;
        });

        // File upload handling
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('dragleave', handleDragLeave);

        fileInput.addEventListener('change', handleFileSelect);
        processBtn.addEventListener('click', processGPX);
        downloadBtn.addEventListener('click', downloadProcessedFile);

        function handleDragOver(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        }

        function handleDragLeave() {
            uploadArea.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        }

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                handleFile(file);
            }
        }

        function handleFile(file) {
            if (!file.name.toLowerCase().endsWith('.gpx')) {
                showError('Please select a valid GPX file.');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                showError('File size must be less than 10MB.');
                return;
            }

            selectedFile = file;
            processBtn.textContent = `Clean "${file.name}"`;
            processBtn.disabled = false;
            hideError();
        }

        async function processGPX() {
            if (!selectedFile) return;

            showLoading();
            hideError();
            hideResults();

            const formData = new FormData();
            formData.append('gpxFile', selectedFile);
            formData.append('settings', JSON.stringify({
                activityType: document.getElementById('activityType').value,
                maxSpeed: parseInt(document.getElementById('maxSpeed').value),
                smoothingFactor: parseInt(document.getElementById('smoothingFactor').value),
                removeElevationNoise: document.getElementById('removeElevationNoise').checked,
                removeDuplicates: document.getElementById('removeDuplicates').checked,
                optimizeForStrava: document.getElementById('optimizeForStrava').checked
            }));

            try {
                const response = await fetch('/api/process-gpx', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    processedData = result.data;
                    showResults(result.stats);
                } else {
                    throw new Error(result.error || 'Processing failed');
                }
            } catch (err) {
                showError(`Failed to process GPX file: ${err.message}`);
            } finally {
                hideLoading();
            }
        }

        function downloadProcessedFile() {
            if (!processedData) return;

            const blob = new Blob([processedData], { type: 'application/gpx+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = selectedFile.name.replace('.gpx', '_cleaned.gpx');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function showLoading() {
            loading.style.display = 'block';
            processBtn.disabled = true;
        }

        function hideLoading() {
            loading.style.display = 'none';
            processBtn.disabled = false;
        }

        function showResults(stats) {
            const statsContainer = document.getElementById('stats');
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${stats.originalPoints}</div>
                    <div class="stat-label">Original Points</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.cleanedPoints}</div>
                    <div class="stat-label">Cleaned Points</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.removedPoints}</div>
                    <div class="stat-label">Removed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.distance}km</div>
                    <div class="stat-label">Distance</div>
                </div>
            `;
            results.style.display = 'block';
        }

        function hideResults() {
            results.style.display = 'none';
        }

        function showError(message) {
            error.textContent = message;
            error.style.display = 'block';
        }

        function hideError() {
            error.style.display = 'none';
        }
    </script>
</body>
</html>