/**
 * 
 * Author: Marko Zeman
 * 
 * */


var HRV = {};

(function (HRV) {

    /** GLOBAL variables */
    
    var heart_rates;
    var time_analysis = {};
    var frequency_analysis = {};
    
    /** GLOBAL variables */
    
    /*
    var main = function() {
        
    };
    
    $(document).ready(main);
    */
    
    
    function heart_rate_distribution (resting_HR, age, training, RR_intervals, qrs_i_raw, frequency) {
        heart_rates = new Array(RR_intervals.length);
        var HRV_graph = new Array(RR_intervals.length);
        var start_time, end_time;
        
        for (var i=0; i<RR_intervals.length; i++) {
            heart_rates[i] = (1/RR_intervals[i]) * 60;
            start_time = qrs_i_raw[i] / frequency;
            end_time = qrs_i_raw[i+1] / frequency;
            
            HRV_graph[i] = {
                heart_rate: heart_rates[i],
                start_time: start_time,
                end_time: end_time
            };
        }
        console.log("heart_rates");
        console.log(heart_rates);
        
        console.log("HRV_graph");
        console.log(HRV_graph);
        
        
        var heart_rates_with_associated_string_classes = new Array(heart_rates.length);
        var string_class = "";
        for (var i in heart_rates) {
            string_class = heart_rate_string_classes (heart_rates[i]);
            heart_rates_with_associated_string_classes[i] = {
                heart_rate: heart_rates[i],
                associated_class: string_class 
            };
        }
        console.log("heart_rates_with_associated_string_classes");
        console.log(heart_rates_with_associated_string_classes);
        
        
        
        if (training) {
            var training_BPM = {
                recovery: 0,
                aerobic: 0,
                anaerobic: 0,
                red_line: 0
            };
            
            var max_HR = 205.8 - (0.685 * age);
            
            for (var i=0; i<RR_intervals.length; i++) {
                training_BPM = add_heart_rate_to_training_BPM_object (heart_rates[i], training_BPM, resting_HR, max_HR);
            }
            
            console.log("training_BPM");
            console.log(training_BPM);
        }
        else {
            var BPM = {
                bpm_sub_60: 0,
                bpm_60_70: 0,
                bpm_70_80: 0,
                bpm_80_90: 0,
                bpm_90_100: 0,
                bpm_100_110: 0,
                bpm_110_120: 0,
                bpm_120_130: 0,
                bpm_130_140: 0,
                bpm_140_150: 0,
                bpm_150_160: 0,
                bpm_160_170: 0,
                bpm_170_180: 0,
                bpm_180_190: 0,
                bpm_190_200: 0,
                bpm_over_200: 0
            };
            
            for (var i=0; i<RR_intervals.length; i++) {
                BPM = add_heart_rate_to_BPM_object (heart_rates[i], BPM);
            }
            
            console.log("BPM");
            console.log(BPM);
        }
    }
    
    
    function time_domain_methods (RR_intervals, average_rr_interval) {
        // eliminate unfit R-R intervals (heart beat below 40 or over 200 bpm)
        RR_intervals = eliminate_unfit_RR_intervals (RR_intervals);
        
        // change seconds to miliseconds
        RR_intervals = QRS.vector_multiplication(RR_intervals, 1000);
        
        var RR_intervals_differences = QRS.diff(RR_intervals);
        
        var SDNN = sample_standard_deviation (RR_intervals, average_rr_interval*1000);       // standard deviation of NN intervals
        SDNN = SDNN.toFixed(2) + " ms";
        
        var RMSSD = sample_standard_deviation (RR_intervals_differences, 0);      // root mean square of successive differences
        RMSSD = RMSSD.toFixed(2) + " ms";
        
        var SDSD = sample_standard_deviation (RR_intervals_differences, QRS.mean(RR_intervals_differences));        // standard deviation of successive differences
        SDSD = SDSD.toFixed(2) + " ms";
        
        var NN50 = differ_more_that_num (RR_intervals_differences, 50);           // the number of pairs of successive NNs that differ by more than 50 ms
        var pNN50 = NN50 / RR_intervals_differences.length;          // the proportion of NN50 divided by total number of NNs
        pNN50 = (pNN50 * 100).toFixed(2) + " %";
        
        var NN20 = differ_more_that_num (RR_intervals_differences, 20);           // the number of pairs of successive NNs that differ by more than 20 ms
        var pNN20 = NN20 / RR_intervals_differences.length;          // the proportion of NN20 divided by total number of NNs
        pNN20 = (pNN20 * 100).toFixed(2) + " %";
        
        
        time_analysis = {
            SDNN: SDNN,
            RMSSD: RMSSD,
            SDSD: SDSD,
            NN50: NN50.toString(),
            pNN50: pNN50,
            NN20: NN20.toString(),
            pNN20: pNN20
        };
        
        console.log("time_analysis");
        console.log(time_analysis);
        
        /*
        console.log("SDNN:  "+SDNN);
        console.log("RMSSD:  "+RMSSD);
        console.log("SDSD:  "+SDSD);
        console.log("NN50:  "+NN50);
        console.log("pNN50:  "+pNN50);
        console.log("NN20:  "+NN20);
        console.log("pNN20:  "+pNN20);
        */
    }
    
    
    function frequency_domain_methods (qrs_i_raw, ecg, frequency) {
        var times = QRS.vector_division(qrs_i_raw, frequency);
        //console.log("times");
        //console.log(times);
        
        var values_at_times = new Array (times.length);
        for (var i=0; i<times.length; i++) {
            if (qrs_i_raw[i] < ecg.length) {
                values_at_times[i] = ecg[qrs_i_raw[i]];
            } 
        }
        //console.log("values_at_times");
        //console.log(values_at_times);
        
        if (values_at_times[values_at_times.length-1] == undefined) {   // the last time and its value are out of the record range because of the delay
            times.splice(times.length-1, 1);
            values_at_times.splice(values_at_times.length-1, 1);
        }
        
        var time_difference_first_to_last = times[times.length-1] - times[0];
        var number_of_points = Math.ceil(time_difference_first_to_last * 4);   // 4 Hz, needs to be sampled every 250 ms
        var hertz = number_of_points / time_difference_first_to_last;
        
        //console.log(time_difference_first_to_last);
        //console.log(number_of_points);
        //console.log(hertz);
        
        var cubic_spline = numeric.spline(times, values_at_times).at(numeric.linspace(times[0], times[times.length-1], number_of_points));
        cubic_spline = make_signal_length_power_of_2(cubic_spline);
        //console.log("cubic spline");
        //console.log(cubic_spline);
        
        
        for (var i=1; i<cubic_spline.length; i++) {
            times[i] = (1/hertz) + times[i-1];
        }
        
        var fft = (new numeric.T(times, cubic_spline)).fft();
        //console.log("fft");
        //console.log(fft);
        
        fft.y = fft.y.splice(0, fft.y.length/2);    // cut y in half
        
        QRS.plot_data (fft.y, "chartContainer_5", "Frequency Analysis", [], 100);
        
        
        // cubis plines on the first tenth of the result with step 0.01 --> indices are from 0 to 0.4 Hz
        values_at_times = [];
        for (var i=0; i<Math.ceil(fft.y.length/10); i++) {
            values_at_times.push(fft.y[i]);
        }
        
        times = Array.from(Array(Math.ceil(fft.y.length/10)).keys());
        
        
        cubic_spline = numeric.spline(times, values_at_times).at(numeric.linspace(times[0], times[times.length-1], times.length*100));
        
        QRS.plot_data (cubic_spline, "chartContainer_6", "Frequency Analysis - cubic interpolation on the first tenth", [], 100);
        
        // calculate frequency bands
        frequency_bands (cubic_spline);
    }
    
    
    function frequency_bands (cubic_spline) {
        // bands of frequency
        var HF = 0;     // high frequency (HF) from 0.15 to 0.4 Hz
        var LF = 0;     // low frequency (LF) from 0.04 to 0.15 Hz 
        var VLF = 0;    // very low frequency (VLF) from 0.0033 to 0.04 Hz
        var ULF = 0;    // ultra low frequency (VLF) from 0 to 0.0033 Hz
        
        var total = 0;
        for (var i in cubic_spline) {
            total += cubic_spline[i];
        }
        
        var len = cubic_spline.length;
        for (var i=0; i<len; i++) {
            if (i > 0.375*len) {    // frequency 0.15 - 0.4 Hz
                HF += cubic_spline[i];
            }
            else if (i > 0.1*len) {     // frequency 0.04 - 0.15 Hz
                LF += cubic_spline[i];
            }
            else if (i > 0.00825*len) {     // frequency 0.0033 - 0.04 Hz
                VLF += cubic_spline[i];
            }
            else {      // frequency below 0.0033 Hz
                ULF += cubic_spline[i];
            }
        }
        
        if (HF < 0) {
            HF = 0;
        }
        if (LF < 0) {
            LF = 0;
        }
        if (VLF < 0) {
            VLF = 0;
        }
        if (ULF < 0) {
            ULF = 0;
        }
        
        HF = ((HF / total)*100).toFixed(2) + " %";
        LF = ((LF / total)*100).toFixed(2) + " %";
        VLF = ((VLF / total)*100).toFixed(2) + " %";
        ULF = ((ULF / total)*100).toFixed(2) + " %";
        
        frequency_analysis = {
            HF: HF,
            LF: LF,
            VLF: VLF,
            ULF: ULF
        };
        
        console.log("frequency_analysis");
        console.log(frequency_analysis);
        
        /*
        console.log("HF: "+HF);
        console.log("LF: "+LF);
        console.log("VLF: "+VLF);
        console.log("ULF: "+ULF);
        */
    }
    
    
    function heart_rate_string_classes (heart_rate) {
        var s = "";
        
        if (heart_rate < 60) {
            s = "sub_60";
        }
        else if (heart_rate < 70) {
            s = "60_70";
        }
        else if (heart_rate < 80) {
            s = "70_80";
        }
        else if (heart_rate < 90) {
            s = "80_90";
        }
        else if (heart_rate < 100) {
            s = "90_100";
        }
        else if (heart_rate < 110) {
            s = "100_110";
        }
        else if (heart_rate < 120) {
            s = "110_120";
        }
        else if (heart_rate < 130) {
            s = "120_130";
        }
        else if (heart_rate < 140) {
            s = "130_140";
        }
        else if (heart_rate < 150) {
            s = "140_150";
        }
        else if (heart_rate < 160) {
            s = "150_160";
        }
        else if (heart_rate < 170) {
            s = "160_170";
        }
        else if (heart_rate < 180) {
            s = "170_180";
        }
        else if (heart_rate < 190) {
            s = "180_190";
        }
        else if (heart_rate < 200) {
            s = "190_200";
        }
        else if (heart_rate >= 200) {
            s = "over_200";
        }
        
        return s;
    }
    
    
    function add_heart_rate_to_BPM_object (heart_rate, BPM) {
        if (heart_rate < 60) {
            BPM.bpm_sub_60++;
        }
        else if (heart_rate < 70) {
            BPM.bpm_60_70++;
        }
        else if (heart_rate < 80) {
            BPM.bpm_70_80++;
        }
        else if (heart_rate < 90) {
            BPM.bpm_80_90++;
        }
        else if (heart_rate < 100) {
            BPM.bpm_90_100++;
        }
        else if (heart_rate < 110) {
            BPM.bpm_100_110++;
        }
        else if (heart_rate < 120) {
            BPM.bpm_110_120++;
        }
        else if (heart_rate < 130) {
            BPM.bpm_120_130++;
        }
        else if (heart_rate < 140) {
            BPM.bpm_130_140++;
        }
        else if (heart_rate < 150) {
            BPM.bpm_140_150++;
        }
        else if (heart_rate < 160) {
            BPM.bpm_150_160++;
        }
        else if (heart_rate < 170) {
            BPM.bpm_160_170++;
        }
        else if (heart_rate < 180) {
            BPM.bpm_170_180++;
        }
        else if (heart_rate < 190) {
            BPM.bpm_180_190++;
        }
        else if (heart_rate < 200) {
            BPM.bpm_190_200++;
        }
        else if (heart_rate >= 200) {
            BPM.bpm_over_200++;
        }
        
        return BPM;
    } 

    
    function add_heart_rate_to_training_BPM_object (heart_rate, training_BPM, resting_HR, max_HR) {
        var recovery_min = resting_HR + (max_HR - resting_HR)*0.6;
        var recovery_max = resting_HR + (max_HR - resting_HR)*0.7;
        
        var aerobic_min = recovery_max;
        var aerobic_max = resting_HR + (max_HR - resting_HR)*0.8;
        
        var anaerobic_min = aerobic_max;
        var anaerobic_max = resting_HR + (max_HR - resting_HR)*0.9;
        
        var red_line_min = anaerobic_max;
        var red_line_max = resting_HR + (max_HR - resting_HR);
        
        if (heart_rate >= recovery_min && heart_rate <= recovery_max) {
            training_BPM.recovery++;
        }
        else if (heart_rate >= aerobic_min && heart_rate <= aerobic_max) {
            training_BPM.aerobic++;
        }
        else if (heart_rate >= anaerobic_min && heart_rate <= anaerobic_max) {
            training_BPM.anaerobic++;
        }
        else if (heart_rate >= red_line_min && heart_rate <= red_line_max) {
            training_BPM.red_line++;
        }
        
        return training_BPM;
    }
    
    
    function differ_more_that_num (data, num) {
        data = QRS.vector_absolute(data);
        var count = 0;
        for (var i=0; i<data.length; i++) {
            if (data[i] > num) {
                count++;
            }
        }
        return count;
    }
    
    
    function eliminate_unfit_RR_intervals (RR_intervals) {
        var hb;
        for (var i=0; i<RR_intervals.length; i++) {
            hb = (1/RR_intervals[i]) * 60;
            if (hb < 40 || hb > 200) {
                RR_intervals.splice(i, 1);
            }
        }
        return RR_intervals;
    }
    
    
    function sample_standard_deviation (data, average_of_data) {
        var sd = 0;
        for (var i=0; i<data.length; i++) {
            sd += Math.pow(data[i] - average_of_data, 2);
        }
        sd /= (data.length-1);
        sd = Math.sqrt(sd);
        
        return sd;
    }
    
    
    function make_signal_length_power_of_2 (ecg) {
        var len = Math.pow(2, Math.ceil(Math.log2(ecg.length)));
        var add = len - ecg.length;
        var arr = new Array(add).fill(0);
        ecg = ecg.concat(arr);
        return ecg;
    }
    
    
    HRV.heart_rates = heart_rates;
    HRV.time_analysis = time_analysis;
    HRV.frequency_analysis = frequency_analysis;
    
    HRV.heart_rate_distribution = heart_rate_distribution;
    HRV.add_heart_rate_to_BPM_object = add_heart_rate_to_BPM_object;
    HRV.add_heart_rate_to_training_BPM_object = add_heart_rate_to_training_BPM_object;
    HRV.time_domain_methods = time_domain_methods;
    HRV.differ_more_that_num = differ_more_that_num;
    HRV.eliminate_unfit_RR_intervals = eliminate_unfit_RR_intervals;
    HRV.sample_standard_deviation = sample_standard_deviation;
    HRV.make_signal_length_power_of_2 = make_signal_length_power_of_2;
    HRV.frequency_domain_methods = frequency_domain_methods;
    
} (HRV) );
