/**
 * 
 * Author: Marko Zeman
 * 
 * Adapted from MATLAB code written by Hooman Sedghamiz
 * 
 * */


var QRS = {};

(function (QRS) {

    /** GLOBAL variables */
    
    var all_coefficients = "";
    
    /** GLOBAL variables */
    
    
    var main = function() {
        
        read_data("testing_examples/100m.mat");
        
    };
    
    $(document).ready(main);
    
    
    
    function read_data (filename) {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", filename, true);
        oReq.responseType = "arraybuffer";
        
        oReq.onload = function (oEvent) {
          var arrayBuffer = oReq.response;
          
          if (arrayBuffer) {
            var byteArray = new Int16Array(arrayBuffer);
            
            var frequency = 360;
            
            var byteArray_channel_1 = [];
            var byteArray_channel_2 = [];
            
            for (var i=12; i<frequency*20*2; i++) {       // examine first 10 seconds of both channels; to do QRS detection on whole example it should be: i < byteArray.length
                if (i < byteArray.length) {
                    if (i % 2 == 0) {
                        byteArray_channel_1.push(byteArray[i]);
                    }
                    else {
                        byteArray_channel_2.push(byteArray[i]);
                    }
                }
                else {
                    console.log("Data is shorter than 10 seconds for each channel.");
                    break;
                }
            }
            
            // norm the data
            byteArray_channel_1 = vector_division(vector_subtraction(byteArray_channel_1, 1024), 200);
            byteArray_channel_2 = vector_division(vector_subtraction(byteArray_channel_2, 1024), 200);
            
            
            readTextFile ("coefficients.txt");
            QRS_algorithm (byteArray_channel_1, frequency);
            
            
            /*
            frequency = 250;
            readTextFile("sample1.csv");
            var ecg_1 = new Array(all_coefficients.length-1);
            var ecg_2 = new Array(all_coefficients.length-1);
            var line;
            for(var i=0; i<all_coefficients.length-1; i++) {
                line = all_coefficients[i].split(','); 
                ecg_1[i] = parseFloat(line[0]);
                ecg_2[i] = parseFloat(line[1]);
            }
            
            readTextFile ("coefficients.txt");
            ecg_1 = cut_vector(ecg_1, 0, Math.round(ecg_1.length/5));
            //plot_data(ecg_1, "chartContainer", "test", [], 1000);
            QRS_algorithm (ecg_1, frequency);
            */
            
          }
        };
        
        oReq.send(null);
    }
    
    function QRS_algorithm (ecg, frequency) {     
        check_frequency (frequency);    // frequency must be between 100-2000 Hz
    
        // Initialize
    	var qrs_i_raw =[];
    	var qrs_amp_raw=[];
    	var delay = 0;
    	
    	/*
    	var qrs_c =[];  // amplitude of R
    	var qrs_i =[];  // index
    	var nois_c =[];
    	var nois_i =[];
    	var skip = 0;       // becomes one when a T wave is detected
    	var not_nois = 0;   // it is not noise when not_nois = 1
    	var m_selected_RR = 0;
    	var mean_RR = 0;
    	var ser_back = 0; 
    	var test_m = 0;
    	var SIGL_buf = [];
    	var NOISL_buf = [];
    	var THRS_buf = [];
    	var SIGL_buf1 = [];
    	var NOISL_buf1 = [];
    	var THRS_buf1 = [];
        */
        
        var ecg_l, ecg_h, h_l, h_h;
        
        var indices_and_values, indices, values;
        
        if (frequency == 200) {
    		// Low Pass Filter  H(z) = ((1 - z^(-6))^2)/(1 - z^(-1))^2
    		h_l = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0, 0];
    		ecg_l = conv (ecg, h_l);
    		ecg_l = vector_division (ecg_l, vector_max(vector_absolute(ecg_l)));
    		delay = 6;  // based on the paper
    		
    		// High Pass Filter H(z) = (-1+32z^(-16)+z^(-32))/(1+z^(-1))
    		h_h = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 31, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0];
    		ecg_h = conv (ecg_l, h_h);
    		ecg_h = vector_division (ecg_h, vector_max(vector_absolute(ecg_h)));
    		delay += 16;     // 16 samples for highpass filtering
        }
    	else {
    		// bandpass filter for noise cancelation of other sampling frequencies (filtering)
    		var coef = all_coefficients[frequency-100].split(' ');    // because it starts with 100 Hz
    		
    		var len_a = parseInt(coef[1]);
    		var len_b = parseInt(coef[2]);
    		
    		var a = cut_vector(coef, 3, 3+len_a-1).map(Number);
    		var b = cut_vector(coef, 3+len_a, 3+len_a+len_b-1).map(Number);
    		
    		ecg_h = filter (a, b, ecg);
    		
    		ecg_h = vector_division (ecg_h, vector_max(vector_absolute(ecg_h)));
    	}
    	
    	
    	// derivative filter H(z) = (1/8T)(-z^(-2) - 2z^(-1) + 2z + z^(2))
    	var h_d = [-0.125, -0.25, 0, 0.25, 0.125];      // 1/8*fs
    	var ecg_d = conv (ecg_h ,h_d);
    	ecg_d = vector_division (ecg_d, vector_max (ecg_d));
    	delay += 2;      // delay of derivative filter 2 samples
    	
        // squaring nonlinearly enhance the dominant peaks
	    var ecg_s = vector_squared(ecg_d);	
    	
    	// moving average Y(nt) = (1/N)[x(nT-(N - 1)T)+ x(nT - (N - 2)T)+...+x(nT)]
    	var ecg_m = conv(ecg_s, vector_division(Array(Math.round(0.15 * frequency)).fill(1), Math.round(0.15 * frequency)));  
    	delay += 15;
    	
    	
    	//var delays = find_delays(ecg, ecg_h, frequency);
    	
    	
    	// find peaks in filtered data
    	/*
    	var beats_up = are_beats_oriented_up(ecg, frequency);
    	if (beats_up) {
    	    indices_and_values = findpeaks(ecg_m, Math.round(0.2 * frequency), "max", frequency);  
    	}
    	else {
    	    indices_and_values = findpeaks(ecg_m, Math.round(0.2 * frequency), "min", frequency);  
    	}
    	*/
    	
    	indices_and_values = findpeaks_windows (ecg_m, Math.round(0.25 * frequency), "max", frequency);      // orientation is always "max" because data are squared
    	indices = indices_and_values[0];
    	values = indices_and_values[1];
    	
    	indices = sort_array_increasing (indices);
        
        indices = delete_duplicates (indices, frequency); 
        
        
    	//var sorted_objects = sort_object_array(indices, values);
    	
    	
    	/*
    	// initialize the training phase (2 seconds of the signal) to determine the THR_SIG and THR_NOISE
    	var THR_SIG = vector_max (cut_vector(ecg_m, 0, 2*frequency-1)) * 1/3;   // 0.25 of the max amplitude 
    	var THR_NOISE = mean (cut_vector(ecg_m, 0, 2*frequency-1)) * 1/2;       // 0.5 of the mean signal is considered to be noise
    	var SIG_LEV = THR_SIG;
    	var NOISE_LEV = THR_NOISE;
    	
    	// Initialize bandpath filter threshold (2 seconds of the bandpass signal)
    	var THR_SIG1 = vector_max (cut_vector(ecg_h, 0, 2*frequency-1)) * 1/3;      // 0.25 of the max amplitude 
    	var THR_NOISE1 = mean (cut_vector(ecg_h, 0, 2*frequency-1)) * 1/2;
    	var SIG_LEV1 = THR_SIG1;        // Signal level in bandpassed filter
    	var NOISE_LEV1 = THR_NOISE1;    // Noise level in bandpassed filter
    
    	var max_2, y_i, x_i;
    	var diffRR, comp;
    	var pks_temp, locs_temp;
    	var y_i_t, x_i_t;
    	var Slope1, Slope2;
    	var curr_value, curr_index;
    	
    	for (var i=0; i<values.length; i++) {
    	    curr_value = sorted_objects[i].value;
    	    curr_index = sorted_objects[i].index;
    	    
    	    // locate the corresponding peak in the filtered signal
    		if ((curr_index - Math.round(0.15*frequency) >= 1) && (curr_index <= ecg_h.length)) {
    			max_2 = vector_max_with_index ((cut_vector (ecg_h, curr_index-Math.round(0.15*frequency)-1, curr_index)));  
    			y_i = max_2[0];
    			x_i = max_2[1];
    		}
    		else if (curr_index >= ecg_h.length) {  
			    max_2 = vector_max_with_index ((cut_vector (ecg_h, curr_index-Math.round(0.15*frequency)-1, ecg_h.length-1))); 
			    y_i = max_2[0];
			    x_i = max_2[1];
	        }
    	    
    	    
    	    // update the heart_rate (two heart rates mean one the most recent and the other selected)
    		if (qrs_c.length >= 9) {
    			diffRR = diff(cut_vector(qrs_i, qrs_i.length-9, qrs_i.length-1));    // calculate RR interval
    			mean_RR = mean(diffRR);          // calculate the mean of 8 previous R waves interval
    			comp = qrs_i[qrs_i.length-1] - qrs_i[qrs_i.length-2];     // latest RR
    			
    			if (comp <= 0.92*mean_RR || comp >= 1.16*mean_RR) {
    				THR_SIG *= 0.5;
    				THR_SIG1 *= 0.5;
    			}		
    			else {
    				m_selected_RR = mean_RR;    // the latest regular beats mean
    			}
    		}
    		
    		
    		// calculate the mean of the last 8 R waves to make sure that QRS is not missing (if no R detected, trigger a search back) 1.66*mean
    		if (m_selected_RR) {
    			test_m = m_selected_RR;     // if the regular RR availabe, use it   
    		}
    		else if (mean_RR && m_selected_RR == 0) {
    			test_m = mean_RR;   
    		}
    		else {
    			test_m = 0;
    		}
    	    
    	    
    	    if (test_m) {
    		    if ((curr_index - qrs_i[qrs_i.length-1]) >= Math.round(1.66*test_m)) {    // it shows that QRS is missed 
    		        // search back and locate the max in this interval
    				max_2 = vector_max_with_index (cut_vector(ecg_m, qrs_i[qrs_i.length-1]+Math.round(0.2*frequency)-1, curr_index-Math.round(0.2*frequency)-1));  
    			    pks_temp = max_2[0];
    			    locs_temp = max_2[1];
    				
    				locs_temp = qrs_i[qrs_i.length-1] + Math.round(0.2*frequency) + locs_temp -1;     // location 
    				 
    				if (pks_temp > THR_NOISE) {
    				    qrs_c.push(pks_temp);
    				    qrs_i.push(locs_temp);
    				  
    				    // find the location in filtered sig
    				    if (locs_temp <= ecg_h.length) {
    					    max_2 = vector_max_with_index (cut_vector (ecg_h, locs_temp-Math.round(0.15*frequency)-1, locs_temp-1));
    				    }
    				    else {
    					    max_2 = vector_max_with_index (cut_vector (ecg_h, locs_temp-Math.round(0.15*frequency)-1, ecg_h.length-1)); 
    				    }
    				    y_i_t = max_2[0];
    				    x_i_t = max_2[1];
    				    
    				    // take care of bandpass signal threshold
    				    if (y_i_t > THR_NOISE1) { 
                            qrs_i_raw.push(locs_temp - Math.round(0.15*frequency) + (x_i_t - 1));       // save index of bandpass 
                            qrs_amp_raw.push(y_i_t);     // save amplitude of bandpass 
                            SIG_LEV1 = 0.25*y_i_t + 0.75*SIG_LEV1;    // when found with the second thres 
    				    }
    				    
    				    not_nois = 1;
    				    SIG_LEV = 0.25*pks_temp + 0.75*SIG_LEV;     // when found with the second threshold             
    				}
    	        }
    			else {
    				  not_nois = 0;
    			}
    	    }
    	    
    	    
    	    // find noise and QRS peaks
    		if (curr_value >= THR_SIG) {
    			// if a QRS candidate occurs within 360 ms of the previous QRS, the algorithm determines if it's T wave or QRS
    			if (qrs_c.length >= 3) {
    				if ((curr_index - qrs_i[qrs_i.length-1]) <= Math.round(0.36*frequency)) {
    					Slope1 = mean(diff(cut_vector(ecg_m, curr_index-Math.round(0.075*frequency)-1, curr_index-1)));   // mean slope of the waveform at that position
    					Slope2 = mean(diff(cut_vector(ecg_m, qrs_i[qrs_i.length-1]-Math.round(0.075*frequency), qrs_i[qrs_i.length-1])));   // mean slope of previous R wave
    					
    					if (Math.abs(Slope1) <= Math.abs(0.5*Slope2)) {      // slope less then 0.5 of previous R
    						 nois_c.push(curr_value);
    						 nois_i.push(curr_index);
    						 skip = 1;      // T wave identification

    						 NOISE_LEV1 = 0.125*y_i + 0.875*NOISE_LEV1;
    						 NOISE_LEV = 0.125*curr_value + 0.875*NOISE_LEV; 
    					}
    					else {
    						 skip = 0;
    					}
    				}
    			}
    			
    			if (skip == 0) {   // skip is 1 when a T wave is detected       
    				qrs_c.push(curr_value);
    				qrs_i.push(curr_index);
    				
    				// bandpass filter check threshold
    				if (y_i >= THR_SIG1) {
    					if (ser_back) {
    					    qrs_i_raw.push(x_i);   // save index of bandpass 
    					}
    					else {
    					    qrs_i_raw.push(curr_index - Math.round(0.15*frequency) + (x_i - 1));      // save index of bandpass
    					}
    					qrs_amp_raw.push(y_i);         // save amplitude of bandpass 
    					SIG_LEV1 = 0.125*y_i + 0.875*SIG_LEV1;      // adjust threshold for bandpass filtered sig
    				}
    				 
    				// adjust Signal level
    				SIG_LEV = 0.125*curr_value + 0.875*SIG_LEV;
    			}
    		}	
    		else if (THR_NOISE <= curr_value && curr_value < THR_SIG) {
    			 // adjust Noise level in filtered sig
    			 NOISE_LEV1 = 0.125*y_i + 0.875*NOISE_LEV1;
    			 // adjust Noise level in MVI
    			 NOISE_LEV = 0.125*curr_value + 0.875*NOISE_LEV; 
    		}
    		else if (curr_value < THR_NOISE) {
    			nois_c.push(curr_value);
    			nois_i.push(curr_index);
    			
    			// noise level in filtered signal
    			NOISE_LEV1 = 0.125*y_i + 0.875*NOISE_LEV1;
    			
    			// adjust Noise level in MVI
    			NOISE_LEV = 0.125*curr_value + 0.875*NOISE_LEV;  
    		}
    		
    		// adjust the threshold with SNR
    		if (NOISE_LEV != 0 || SIG_LEV != 0) {
    			THR_SIG = NOISE_LEV + 0.25*(Math.abs(SIG_LEV - NOISE_LEV));
    			THR_NOISE = 0.5 * THR_SIG;
    		}
    		
    		// adjust the threshold with SNR for bandpassed signal
    		if (NOISE_LEV1 != 0 || SIG_LEV1 != 0) {
    			THR_SIG1 = NOISE_LEV1 + 0.25*(Math.abs(SIG_LEV1 - NOISE_LEV1));
    			THR_NOISE1 = 0.5 * THR_SIG1;
    		}
    		
    	    // take a track of thresholds of smoothed signal
    		SIGL_buf.push(SIG_LEV);
    		NOISL_buf.push(NOISE_LEV);
    		THRS_buf.push(THR_SIG);
    		
    		// take a track of thresholds of filtered signal
    		SIGL_buf1.push(SIG_LEV1);
    		NOISL_buf1.push(NOISE_LEV1);
    		THRS_buf1.push(THR_SIG1);
    		
    		skip = 0;       // reset parameters
    		not_nois = 0;   // reset parameters
    		ser_back = 0;   // reset bandpass parameter
    	}
    	*/
    	
    	/*
    	// remove delays from qrs_i_raw
    	for (var i=0; i<qrs_i_raw.length; i++) {
    	    if (qrs_i_raw.length == delays.length) {
    	        qrs_i_raw[i] -= delays[i];    
    	    }
    	}
    	*/
    	
    	// make vertical QRS lines
    	//var vertical_lines = make_vertical_QRS_lines(qrs_i_raw);
    	var vertical_lines = make_vertical_QRS_lines(indices);
    	
    	// calculate R-R intervals and heart rate and write it to the screen
    	//RR_intervals_and_heart_rate (qrs_i_raw, frequency, ecg);
    	RR_intervals_and_heart_rate (indices, frequency, ecg);
    	
    	
    	// plot all graphs
    	plot_graphs (ecg, ecg_h, ecg_m, vertical_lines, frequency);
    	
    	
    	return [qrs_amp_raw, indices, delay];
        // 	return [qrs_amp_raw, qrs_i_raw, delay];
    }
    
    function findpeaks_windows (vector, min_distance, min_or_max, frequency) {
        var time = vector.length / frequency;   // in seconds 
        var remaining_time = time;
        var indices_and_values = [];
        var indices = [];
        var values = [];
        var count = 0;
        var vector_10s;
        
        while (remaining_time >= 10) {
            vector_10s = cut_vector(vector, count*(10*frequency), (count+1)*(10*frequency)-1);
            
            indices_and_values = findpeaks(vector_10s, min_distance, min_or_max, frequency);
            indices_and_values = correct_findpeaks_results(indices_and_values[0], indices_and_values[1], min_or_max);
            
            indices_and_values[0] = vector_summing (indices_and_values[0], count*(10*frequency));
            
            indices = indices.concat(indices_and_values[0]);
            values = values.concat(indices_and_values[1]);
            
            count++;
            remaining_time -= 10;
        }

        // the remaining time if the sample isn't divisible by 10 s      
        vector_10s = cut_vector(vector, count*(10*frequency), vector.length-1);
        
        indices_and_values = findpeaks(vector_10s, min_distance, min_or_max, frequency);
        indices_and_values = correct_findpeaks_results(indices_and_values[0], indices_and_values[1], min_or_max);
        
        indices_and_values[0] = vector_summing (indices_and_values[0], count*(10*frequency));
        
        
        if (indices_and_values[0].length > 1) {     // only add if it's not the only one in last window because it might be wrong because oh short window 
            indices = indices.concat(indices_and_values[0]);
            values = values.concat(indices_and_values[1]);
        }
        
        return [indices, values];
    }
    
    function delete_duplicates (indices, frequency) {
        // delete doubled peaks 
        for (var i=1; i<indices.length; i++) {
            if (indices[i-1]+1 == indices[i]) {
                indices.splice(i, 1);
                i--;
            }
        }
        
        // delete peaks that are too close, in the range of 0.25*frequency
        var distance = 0.25 * frequency;    
        var distance_1, distance_2;
        for (var i=1; i<indices.length; i++) {
            if (indices[i] - indices[i-1] <= distance) {
                /*
                console.log("indices[i]: "+indices[i]);
                console.log("indices[i-1]: "+indices[i-1]);
                */
                if (indices[i] % (10*frequency) == 0) {   // if the peak is the first index of window, delete it
                    indices.splice(i, 1);
                    continue;
                }    
                /*
                console.log("between");
                console.log(indices);
                console.log("indices[i]: "+indices[i]);
                console.log("indices[i-1]: "+indices[i-1]);
                */
                if ((indices[i-1]+1) % (10*frequency) == 0) {   // if the peak is the last index of window, delete it
                    indices.splice(i-1, 1);
                    continue;
                }
                
                distance_1 = indices[i] % (10*frequency);
                distance_2 = indices[i-1] % (10*frequency);
                if (distance_1 > distance_2) {
                    indices.splice(i-1, 1);
                }
                else {
                    indices.splice(i, 1);
                }
                
                i--;
            }
        }
        
        return indices;
    }

    function plot_data (byteArray, chart_id, title, vertical_lines, frequency) {
        var t = [];
		for (var i=0; i<byteArray.length; i++) {  
			t.push({
			    x: i,
				y: byteArray[i]
			});
		}
	    
		var chart = new CanvasJS.Chart(chart_id, {
		    title:{
                text: title
            },
			axisX: {
				interval: frequency,
				stripLines: vertical_lines
			},
			data: [{
				type: "line",
				dataPoints: t,
				color: "CornflowerBlue",
			}]
		});
		chart.render();
    }
    
    function plot_graphs (ecg, ecg_h, ecg_m, vertical_lines, frequency) {
        plot_data (ecg, "chartContainer", "Raw data", [], frequency);
    	plot_data (ecg_h, "chartContainer_2", "Filtered data", [], frequency);
    	plot_data(ecg_m, "chartContainer_3", "Squared data", [], frequency);
    	plot_data (ecg, "chartContainer_4", "Raw data with QRS lines", vertical_lines, frequency);
    }
    
    function make_vertical_QRS_lines (qrs_i_raw) {
        var vertical_lines = [];
    	for (var i=0; i<qrs_i_raw.length; i++) {
    	    vertical_lines.push({
    	        value: qrs_i_raw[i],               
                color: 'Red',
                label: qrs_i_raw[i],
                labelFontColor: "Black"
    	    });
    	}
    	return vertical_lines;
    }

    function readTextFile (file) {
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, false);        // async = false
        rawFile.onreadystatechange = function ()
        {
            if(rawFile.readyState === 4)
            {
                if(rawFile.status === 200 || rawFile.status == 0)
                {
                    all_coefficients = rawFile.responseText.split('\n');
                }
            }
        };
        rawFile.send(null);
    }
    
    function RR_intervals_and_heart_rate (qrs_i_raw, frequency, ecg) {
        var RR_intervals = diff(qrs_i_raw);
    	RR_intervals = vector_division(RR_intervals, frequency);
    	
    	var s = "";
    	for (var i=0; i<RR_intervals.length; i++) {
    	    s += (RR_intervals[i]).toFixed(4) + " s ";
    	    if (i != RR_intervals.length-1) {
    	        s += ", ";
    	    }
    	}
    	s = s.fontcolor("CornflowerBlue");
    	$("#rr_intervals").append(s);
    	
    	var average_rr_interval = mean(RR_intervals);
    	s = average_rr_interval.toFixed(2);
    	s = (s + " s").toString().fontcolor("CornflowerBlue");
    	$("#average_rr_interval").append(s);
    	
    	var heart_rate = (1/average_rr_interval) * 60;
    	s = (Math.round(heart_rate).toString() + " beats per minute").fontcolor("CornflowerBlue");
    	$("#heart_rate").append(s);
    	
    	/*
    	console.log("qrs_i_raw: "+qrs_i_raw);
    	console.log("frequency: "+frequency);
    	console.log("RR_intervals: "+RR_intervals);
    	console.log("average_rr_interval: "+average_rr_interval);
    	console.log("heart rate: "+heart_rate);
    	*/
    	
    	// save heart rate variability to an object
    	HRV.heart_rate_distribution(60, 30, false, RR_intervals, qrs_i_raw, frequency);
    	
    	
    	// calculate time domain info
    	HRV.time_domain_methods(RR_intervals, average_rr_interval);
    	
    	
    	// calculate frequeny domain info
    	HRV.frequency_domain_methods (qrs_i_raw, ecg, frequency);
    } 
    
    function sort_array_increasing (arr) {
        return arr.sort(function(a, b) {return a-b} );
    }
    
    function check_frequency (frequency) {
        if (frequency >= 100 && frequency <= 2000) {
            return;
        }
        else {
            throw new Error("Frequency is not in the correct range (100-2000 Hz)");
        }
    }
    
    function filter (b, a, x) {
        var y = Array(x.length).fill(0);
        
        var c = vector_division(a, a[0]);
        var d = vector_division(b, a[0]);
        
        var N = a.length - 1;
        var M = b.length - 1;
        
        var sum1, sum2;
        
        for (var n=0; n<x.length; n++) {
            // first sum
            sum1 = 0;
            for (var k=0; k<N; k++) {
                if (n-k < 1) {
                    break;
                }
                sum1 += c[k+1] * y[n-k-1];
            }
            
            // second sum
            sum2 = 0;
            for (var k=-1; k<M; k++) {
                if (n-k < 1) {
                    break;
                }
                sum2 += d[k+1] * x[n-k-1];
            }
            
            y[n] = -sum1 + sum2;
        }
        
        return y;
    }
    
    function diff (vector) {
        var res = new Array(vector.length - 1);
        for (var i=1; i<vector.length; i++) {
            res[i-1] = vector[i] - vector[i-1];
        }
        return res;
    }
    
    function mean (vector) {
        var sum = 0;
        for (var i=0; i<vector.length; i++) {
            sum += vector[i];
        }
        return (sum / vector.length);
    }
    
    function conv (u, v) {
        var res = new Array(u.length + v.length - 1).fill(0);
        var pos;
        for (var i=0; i<u.length; i++) {
            pos = i;
            for (var j=0; j<v.length; j++) {
                res[pos] += u[i] * v[j];
                pos++;
            }
        }
        return res;
    }
    
    function findpeaks (vector, min_distance, min_or_max, frequency) {
        var checked = new Array(vector.length).fill(false);
        var indices = [];
        var values = [];
        var peak, index;
        
        while (!all_checked(checked)) {
            if (min_or_max == "max") {
                peak = find_peak(vector, checked);  
            }
            else {
                peak = find_min_peak(vector, checked);
            }
            
            index = peak[0];
            if (index != -1) {    // peak found
                indices.push(index);
                values.push(peak[1]);
                
                // consider min_distance left and right from index of the peak
                for (var i=index-min_distance; i<=index+min_distance; i++) {
                    if (i < 0) {
                        i = 0;
                    }
                    else if (i >= vector.length) {
                        break;
                    }    
                    checked[i] = true;
                }
            }
        }
        
        return [indices, values];
        
        /*
        var checked = [];
        var indices = [];
        var values = [];
        var peak, index;
        
        while (index != -1) {
            if (min_or_max == "max") {
                peak = find_peak(vector, checked, frequency);  
            }
            else {
                peak = find_min_peak(vector, checked, frequency);
            }
            
            index = peak[0];
            if (index != -1) {    // peak found
                indices.push(index);
                values.push(peak[1]);
                
                // consider min_distance left and right from index of the peak
                checked.push({
                    start: index-min_distance,
                    end: index+min_distance
                });
            }
        }
        
        return [indices, values];
        */
    }
    
    function find_peak (vector, checked) {
        var i_max = -1;
        var v_max = Number.NEGATIVE_INFINITY;
        
        for (var i=0; i<vector.length; i++) {
            if (checked[i] == false && vector[i] > v_max) {
                v_max = vector[i];
                i_max = i;
            }
        }
        
        return [i_max, v_max];
        
        /*
        var i_max = -1;
        var v_max = Number.NEGATIVE_INFINITY;
        
        for (var i=0; i<vector.length; i++) {
            if (possible_peak(i, checked)) {
                if (vector[i] > v_max) {
                    v_max = vector[i];
                    i_max = i;
                }
            }
            else {
                i += Math.round(0.4 * frequency);
            }
        }
        
        return [i_max, v_max];
        */
    }
    
    function find_min_peak (vector, checked) {
        var i_min = -1;
        var v_min = Number.POSITIVE_INFINITY;
        
        for (var i=0; i<vector.length; i++) {
            if (checked[i] == false && vector[i] < v_min) {
                v_min = vector[i];
                i_min = i;
            }
        }
        
        return [i_min, v_min];
        
        /*
        var i_min = -1;
        var v_min = Number.POSITIVE_INFINITY;
        
        for (var i=0; i<vector.length; i++) {
            if (possible_peak(i, checked)) {
                if (vector[i] < v_min) {
                    v_min = vector[i];
                    i_min = i;
                }
            }
            else {
                i += Math.round(0.4 * frequency);
            }
        }
        
        return [i_min, v_min];
        */
    }
    
    function correct_findpeaks_results (indices, values, min_or_max) {
        /*
        var at_least_two_times_bigger_than_all_others = true;
    	var unfit_indices = [];
    	var unfit_values = [];
    	for (var i=0; i<values.length; i++) {
    	    at_least_two_times_bigger_than_all_others = true;
    	    for (var j=0; j<values.length; j++) {
    	        if (i != j) {
    	            if (values[i] < values[j]*2) {
    	                at_least_two_times_bigger_than_all_others = false;
    	            }
    	        }
    	    }
    	    if (at_least_two_times_bigger_than_all_others) {    // this shouldn't be considered in the average
    	        unfit_indices.push(i);
    	        unfit_values.push(values[i]);
    	    }
    	}
    	
    	// deleting unfit indices and values
    	for (var i=0; i<unfit_indices.length; i++) {
    	    //indices.splice(unfit_indices[i], 1);
    	    values.splice(unfit_indices[i], 1);
    	}
    	*/
    	
    	// average without unfit values
    	var average = mean(values);
    	
    	/*
    	console.log("average: "+average);
    	console.log("min_max:  "+min_or_max);
    	
    	console.log(indices);
    	console.log(values);
    	*/
    	
    	// deleting unwanted small peaks
    	for (var i=0; i<values.length; i++) {
    	    if (min_or_max == "max" && values[i] < average) {
    	        values.splice(i, 1);
    	        indices.splice(i, 1);
    	        i--;
    	    }
    	    else if (min_or_max == "min" && values[i] > average) {
    	        values.splice(i, 1);
    	        indices.splice(i, 1);
    	        i--;
    	    }
    	}
    	/*
    	// adding back unfit indices and values
    	for (var i=0; i<unfit_indices.length; i++) {
    	    //indices.splice(unfit_indices[i], 0, unfit_values[i]);           //////////////////////////////////////////////////////////////////////////
    	    values.splice(unfit_indices[i], 0, unfit_values[i]);
    	}
    	*/
    	
    	/*
    	console.log("after");
    	console.log(indices);
    	console.log(values);
        */
        
    	return [indices, values];
    }
    
    function all_checked (boolean_vector) {
        for (var i=0; i<boolean_vector.length; i++) {
            if (boolean_vector[i] == false) {
                return false;
            }
        }
        return true;
    }
    
    function vector_summing (vector, add) {
        var new_vector = new Array(vector.length);
        for (var i=0; i<vector.length; i++) {
            new_vector[i] = vector[i] + add;
        }
        return new_vector;
    }
    
    function vector_subtraction (vector, subtract) {
        var new_vector = new Array(vector.length);
        for (var i=0; i<vector.length; i++) {
            new_vector[i] = vector[i] - subtract;
        }
        return new_vector;
    }
    
    function vector_multiplication (vector, multiplier) {
        var new_vector = new Array(vector.length);
        for (var i=0; i<vector.length; i++) {
            new_vector[i] = vector[i] * multiplier;
        }
        return new_vector;
    }
    
    function vector_division (vector, divisor) {
        var new_vector = new Array(vector.length);
        for (var i=0; i<vector.length; i++) {
            new_vector[i] = vector[i] / divisor;
        }
        return new_vector;
    }
    
    function vector_squared (vector) {
        return vector.map(function (x) {
            return Math.pow(x, 2);
        });
    }
    
    function vector_absolute (vector) {
        return vector.map(function (x) {
            return Math.abs(x);
        });
    }

    function vector_max (vector) {
        return Math.max.apply(null, vector);
    }
    
    function cut_vector (vector, start, end) {       // including start and end index
        var new_vector = new Array(end - start + 1);
        var count = 0;
        
        for (var i=start; i<=end; i++) {
            new_vector[count] = vector[i];
            count++;
        }
        
        return new_vector;
    }
    
    /*
    function heart_rate_without_filter (ecg, frequency) {
        // find peaks on inverted raw ecg signal on the y-axis (used for removal of delay)
        var raw_indices_and_values, raw_indices, raw_values;
        var beats_oriented_up = are_beats_oriented_up(ecg);
        if (beats_oriented_up) {   
            raw_indices_and_values = findpeaks(ecg, Math.round(0.2 * frequency), "max", frequency);
        }
        else {
            raw_indices_and_values = findpeaks(ecg, Math.round(0.2 * frequency), "min", frequency);
        }
    	raw_indices = raw_indices_and_values[0];
    	raw_values = raw_indices_and_values[1];
    	
    	//console.log("index before");
        //console.log(raw_indices);
    	
    	if (beats_oriented_up) {
    	    raw_indices_and_values = correct_findpeaks_results (raw_indices, raw_values, "max");
    	}
    	else {
    	    raw_indices_and_values = correct_findpeaks_results (raw_indices, raw_values, "min");
    	}
        
        raw_indices = sort_array_increasing(raw_indices_and_values[0]);
        
        if (raw_indices[0] == 0) {      //peak at the start is not necessary right
            raw_indices.splice(0, 1);
        }
        
        //console.log("index after");
        //console.log(raw_indices);
        
        var RR_intervals = diff(raw_indices);
        var average_RR_interval = mean(RR_intervals);
        var heart_rate = (frequency / average_RR_interval) * 60;
        
        return Math.round(heart_rate);
    }
    
    function possible_peak (ind, checked) {
        for (var i=0; i<checked.length; i++) {
            if (ind >= checked[i].start && ind <= checked[i].end) {
                return false;
            }
        }
        return true;
    }
    
    function find_delays (ecg, ecg_h, frequency) {
        // find peaks on inverted raw ecg signal on the y-axis (used for removal of delay)
        var raw_indices_and_values, raw_indices, raw_values;
        var beats_oriented_up = are_beats_oriented_up(ecg, frequency);
        if (beats_oriented_up) {   
            raw_indices_and_values = findpeaks(ecg, Math.round(0.2 * frequency), "max", frequency);
        }
        else {
            raw_indices_and_values = findpeaks(ecg, Math.round(0.2 * frequency), "min", frequency);
        }
    	raw_indices = raw_indices_and_values[0];
    	raw_values = raw_indices_and_values[1];
    	
    	if (beats_oriented_up) { 
            raw_indices_and_values = correct_findpeaks_results (raw_indices, raw_values, "max"); 
    	}
    	else {
    	    raw_indices_and_values = correct_findpeaks_results (raw_indices, raw_values, "min"); 
    	}
        raw_indices = sort_array_increasing(raw_indices_and_values[0]);
        
    	    
    	// find peaks in filtered data (used for removal of delay)
    	var indices_and_values = findpeaks(ecg_h, Math.round(0.2 * frequency), "max", frequency);
    	var indices = indices_and_values[0];
    	var values = indices_and_values[1];
    	
        indices_and_values = correct_findpeaks_results (indices, values, "max");
        indices = sort_array_increasing(indices_and_values[0]);
    	
    	
    	// save the peak indices differences
    	var delays = [];
    	if (raw_indices.length >= indices.length) {
    	    for (var i=0; i<indices.length; i++) {
    	        delays.push(indices[i] - raw_indices[i]);
    	    }
    	}
    	else {
    	    console.warn("Raw ECG signal has less peaks than filtered signal; delay will appear.");
    	}
    	
    	return delays;
    }
    
    function invert_signal (vector) {
        var new_vector = new Array(vector.length);
        for (var i=0; i<vector.length; i++) {
            new_vector[i] = -vector[i];
        }
        return new_vector;
    }
    
    function sort_object_array (indices, values) {
        var obj_array = [];
    	for (var i=0; i<values.length; i++) {
    	    obj_array.push({
    	        value: values[i],
    	        index: indices[i]
    	    });
    	}
    	
    	obj_array.sort(function(a, b) {
            return a.index - b.index;
        });
        
        return obj_array;
    }
    
    function are_beats_oriented_up (vector, frequency) {
        var sub_0 = 0;
        var above_0 = 0;
        for (var i=0; i<frequency*3; i++) {
            if (vector[i] < 0) {
                sub_0++;
            }
            else {
                above_0++;
            }
        }
        return sub_0 > above_0;
    }
    
    function vector_max_with_index (vector) {
        var i_max = -1;
        var v_max = Number.NEGATIVE_INFINITY;
        
        for (var i=0; i<vector.length; i++) {
            if (vector[i] > v_max) {
                v_max = vector[i];
                i_max = i;
            }
        }
        return [v_max, i_max];
    }
    */
    
    QRS.read_data = read_data;
    QRS.QRS_algorithm = QRS_algorithm;
    QRS.plot_data = plot_data;
    QRS.plot_graphs = plot_graphs;
    QRS.RR_intervals_and_heart_rate = RR_intervals_and_heart_rate;
    QRS.vector_multiplication = vector_multiplication;
    QRS.vector_division = vector_division;
    QRS.vector_absolute = vector_absolute;
    QRS.mean = mean;
    QRS.diff = diff;
    
} (QRS) );
