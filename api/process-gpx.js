const xml2js = require('xml2js');
const formidable = require('formidable');
const fs = require('fs');

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Helper function to calculate speed between two points
function calculateSpeed(point1, point2) {
    const distance = calculateDistance(
        parseFloat(point1.$.lat),
        parseFloat(point1.$.lon),
        parseFloat(point2.$.lat),
        parseFloat(point2.$.lon)
    );
    
    const time1 = new Date(point1.time[0]).getTime();
    const time2 = new Date(point2.time[0]).getTime();
    const timeDiff = (time2 - time1) / 1000 / 3600; // hours
    
    if (timeDiff === 0) return 0;
    return distance / timeDiff; // km/h
}

// Remove outlier points based on speed
function removeSpeedOutliers(trackPoints, maxSpeed) {
    if (trackPoints.length < 3) return trackPoints;
    
    const filtered = [trackPoints[0]]; // Always keep first point
    
    for (let i = 1; i < trackPoints.length - 1; i++) {
        const speed = calculateSpeed(trackPoints[i - 1], trackPoints[i]);
        if (speed <= maxSpeed) {
            filtered.push(trackPoints[i]);
        }
    }
    
    if (trackPoints.length > 1) {
        filtered.push(trackPoints[trackPoints.length - 1]); // Always keep last point
    }
    
    return filtered;
}

// Apply smoothing to coordinates
function smoothCoordinates(trackPoints, smoothingFactor) {
    if (trackPoints.length < 3 || smoothingFactor === 1) return trackPoints;
    
    const smoothed = [...trackPoints];
    const windowSize = Math.min(smoothingFactor, 5);
    
    for (let i = windowSize; i < trackPoints.length - windowSize; i++) {
        let latSum = 0, lonSum = 0, eleSum = 0;
        let eleCount = 0;
        
        for (let j = i - windowSize; j <= i + windowSize; j++) {
            latSum += parseFloat(trackPoints[j].$.lat);
            lonSum += parseFloat(trackPoints[j].$.lon);
            
            if (trackPoints[j].ele) {
                eleSum += parseFloat(trackPoints[j].ele[0]);
                eleCount++;
            }
        }
        
        const totalPoints = (windowSize * 2) + 1;
        smoothed[i].$.lat = (latSum / totalPoints).toFixed(7);
        smoothed[i].$.lon = (lonSum / totalPoints).toFixed(7);
        
        if (eleCount > 0) {
            smoothed[i].ele = [(eleSum / eleCount).toFixed(1)];
        }
    }
    
    return smoothed;
}

// Remove duplicate points
function removeDuplicatePoints(trackPoints) {
    if (trackPoints.length < 2) return trackPoints;
    
    const filtered = [trackPoints[0]];
    
    for (let i = 1; i < trackPoints.length; i++) {
        const current = trackPoints[i];
        const previous = trackPoints[i - 1];
        
        const distance = calculateDistance(
            parseFloat(previous.$.lat),
            parseFloat(previous.$.lon),
            parseFloat(current.$.lat),
            parseFloat(current.$.lon)
        );
        
        // Keep point if it's more than 5 meters from previous point
        if (distance > 0.005) {
            filtered.push(current);
        }
    }
    
    return filtered;
}

// Fix elevation data by smoothing
function fixElevationData(trackPoints) {
    const validElevations = trackPoints
        .map((point, index) => ({ elevation: point.ele ? parseFloat(point.ele[0]) : null, index }))
        .filter(item => item.elevation !== null && !isNaN(item.elevation));
    
    if (validElevations.length < 2) return trackPoints;
    
    // Simple interpolation for missing elevations
    trackPoints.forEach((point, index) => {
        if (!point.ele || isNaN(parseFloat(point.ele[0]))) {
            // Find nearest valid elevations
            const before = validElevations.filter(item => item.index < index).pop();
            const after = validElevations.find(item => item.index > index);
            
            if (before && after) {
                const ratio = (index - before.index) / (after.index - before.index);
                const interpolated = before.elevation + (after.elevation - before.elevation) * ratio;
                point.ele = [interpolated.toFixed(1)];
            } else if (before) {
                point.ele = [before.elevation.toFixed(1)];
            } else if (after) {
                point.ele = [after.elevation.toFixed(1)];
            }
        }
    });
    
    return trackPoints;
}

// Optimize for Strava compatibility
function optimizeForStrava(gpxData, trackPoints) {
    // Ensure proper metadata
    if (!gpxData.gpx.metadata) {
        gpxData.gpx.metadata = [{}];
    }
    
    // Add creator info if missing
    if (!gpxData.gpx.$) {
        gpxData.gpx.$ = {};
    }
    gpxData.gpx.$.creator = 'GPX Cleaner - Optimized for Strava';
    gpxData.gpx.$.version = '1.1';
    
    // Ensure each trackpoint has required fields
    trackPoints.forEach(point => {
        // Ensure time exists
        if (!point.time || !point.time[0]) {
            // Generate approximate time if missing
            const baseTime = new Date('2024-01-01T12:00:00Z');
            point.time = [baseTime.toISOString()];
        }
        
        // Ensure elevation exists
        if (!point.ele) {
            point.ele = ['0'];
        }
    });
    
    return gpxData;
}

// Main processing function
function processGPXData(gpxData, settings) {
    if (!gpxData.gpx || !gpxData.gpx.trk || !gpxData.gpx.trk[0] || !gpxData.gpx.trk[0].trkseg) {
        throw new Error('Invalid GPX format - no track segments found');
    }
    
    const originalStats = {
        originalPoints: 0,
        cleanedPoints: 0,
        removedPoints: 0,
        distance: 0
    };
    
    // Process each track segment
    gpxData.gpx.trk.forEach(track => {
        if (!track.trkseg) return;
        
        track.trkseg.forEach(segment => {
            if (!segment.trkpt) return;
            
            let trackPoints = segment.trkpt;
            originalStats.originalPoints += trackPoints.length;
            
            // Remove duplicate points
            if (settings.removeDuplicates) {
                trackPoints = removeDuplicatePoints(trackPoints);
            }
            
            // Remove speed outliers
            if (trackPoints.length > 2) {
                trackPoints = removeSpeedOutliers(trackPoints, settings.maxSpeed);
            }
            
            // Apply coordinate smoothing
            if (settings.smoothingFactor > 1) {
                trackPoints = smoothCoordinates(trackPoints, settings.smoothingFactor);
            }
            
            // Fix elevation data
            if (settings.removeElevationNoise) {
                trackPoints = fixElevationData(trackPoints);
            }
            
            // Calculate total distance
            for (let i = 1; i < trackPoints.length; i++) {
                originalStats.distance += calculateDistance(
                    parseFloat(trackPoints[i - 1].$.lat),
                    parseFloat(trackPoints[i - 1].$.lon),
                    parseFloat(trackPoints[i].$.lat),
                    parseFloat(trackPoints[i].$.lon)
                );
            }
            
            segment.trkpt = trackPoints;
            originalStats.cleanedPoints += trackPoints.length;
        });
    });
    
    originalStats.removedPoints = originalStats.originalPoints - originalStats.cleanedPoints;
    originalStats.distance = Math.round(originalStats.distance * 100) / 100;
    
    // Optimize for Strava if requested
    if (settings.optimizeForStrava) {
        gpxData = optimizeForStrava(gpxData, segment.trkpt);
    }
    
    return { gpxData, stats: originalStats };
}

// Main handler function
module.exports = async function handler(req, res) {
    console.log('API endpoint called:', req.method, req.url);
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        console.log('Starting file processing...');
        const form = formidable({
            maxFileSize: 100 * 1024 * 1024, // 100MB - much higher limit
            allowEmptyFiles: false,
            maxFields: 10,
            maxFieldsSize: 1024 * 1024, // 1MB for form fields
        });
        
        const [fields, files] = await form.parse(req);
        console.log('Form parsed, files:', Object.keys(files), 'fields:', Object.keys(fields));
        
        if (!files.gpxFile || !files.gpxFile[0]) {
            console.log('No GPX file found in request');
            return res.status(400).json({ success: false, error: 'No GPX file provided' });
        }
        
        const gpxFile = files.gpxFile[0];
        
        // Validate file size
        const fileSizeMB = gpxFile.size / (1024 * 1024);
        if (fileSizeMB > 100) {
            return res.status(413).json({ 
                success: false, 
                error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds the maximum allowed limit (100MB)` 
            });
        }
        
        const settings = JSON.parse(fields.settings[0]);
        
        // Read and parse GPX file
        const fs = require('fs');
        const gpxContent = fs.readFileSync(gpxFile.filepath, 'utf8');
        
        // Basic GPX validation
        if (!gpxContent.includes('<gpx') || !gpxContent.includes('</gpx>')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid GPX file format. File must contain valid GPX XML structure.' 
            });
        }
        
        const parser = new xml2js.Parser({
            explicitArray: true,
            mergeAttrs: false,
            explicitRoot: true
        });
        
        const gpxData = await parser.parseStringPromise(gpxContent);
        
        // Process the GPX data
        const { gpxData: processedGpxData, stats } = processGPXData(gpxData, settings);
        
        // Convert back to XML
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            rootName: 'gpx'
        });
        
        const processedXML = builder.buildObject(processedGpxData.gpx);
        
        // Clean up temporary file
        fs.unlinkSync(gpxFile.filepath);
        
        res.status(200).json({
            success: true,
            data: processedXML,
            stats: stats
        });
        
    } catch (error) {
        console.error('Processing error:', error);
        
        // Handle specific error types
        let errorMessage = 'Internal server error';
        let statusCode = 500;
        
        if (error.message.includes('maxFileSize')) {
            errorMessage = 'File size exceeds the maximum allowed limit (100MB)';
            statusCode = 413;
        } else if (error.message.includes('ENOENT')) {
            errorMessage = 'File not found or corrupted';
            statusCode = 400;
        } else if (error.message.includes('XML')) {
            errorMessage = 'Invalid GPX file format. Please ensure the file is a valid GPX file.';
            statusCode = 400;
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Invalid settings format';
            statusCode = 400;
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Processing timeout. The file might be too large or complex.';
            statusCode = 408;
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}