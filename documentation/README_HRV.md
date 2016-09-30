# Heart rate variability (HRV)
***

## Algorithm implements HRV time and frequency analysis as well as training and non-training heart rate distribution.

***

## Important variables

###### **heart_rates** -- global array of heart rates, calculated from RR intervals
###### **time_analysis** -- global object that contains info about SDNN, RMSSD, SDSD, NN50, pNN50, NN20, pNN20
###### **frequency_analysis** -- global object that contains info about HF, LF, VLF, ULF percentage 
###### **HRV_graph** -- array of objects (the same length as heart_rates array), each object contains heart rate and its starting and ending time
###### **heart\_rates\_with\_associated\_string\_classes** -- array of objects (the same length as heart_rates array), each object contains heart rate and its associated string class (one of the 16 possibles)
###### **training_BPM** -- object which counts occurrences of each of 4 classes (training mode)
###### **BPM** -- object which counts occurrences of each of 16 classes (non-training mode)

***

## Functions

### heart\_rate\_distribution (resting\_HR, age, training, RR\_intervals, qrs\_i\_raw, frequency)

    * For every RR-interval calculates heart rate and starting and ending time.
    * Makes an object for every heart beat with associated string class. 
    * Calculates training or non-training heart rate distribution.
    *
    * @param  resting_HR
    *   Heart rate of the patient when resting.
    * @param  age
    *   Patient age.  
    * @param  training
    *   Boolean, true if training and false if non-training.
    * @param  RR_intervals
    *   Array of RR-intervals (in seconds).
    * @param  qrs_i_raw
    *   Indices of the peaks.
    * @param  frequency
    *   Sampling frequency.
    
### time\_domain\_methods (RR\_intervals, average\_rr\_interval)

    * Eliminates unfit R-R intervals (where heart beat is below 40 or over 200 bpm).
    * Calculates time domain parameters SDNN, RMSSD, SDSD, NN50, pNN50, NN20, pNN20.
    *
    * @param  RR_intervals
    *   Array of RR-intervals (in seconds).
    * @param  average_rr_interval
    *   Average of RR-intervals array.
    
### frequency\_domain\_methods (qrs\_i\_raw, ecg, frequency)

    * Makes cubic interpolation on the values where peaks (qrs_i_raw) are found.
    * Interpolation returns sampled values for approximately every 250 ms (4 Hz).
    * On this data performs FFT and uses only the first half because it is symmetric.
    * The results of FFT then represents 4 Hz, which is why I took only the first tenth of the data (0 - 0.4 Hz).
    * Then again on this first tenth of data cubic interpolation is made with the step 0.01.
    * After that, percentage for each frequency band is calculated.
    * 
    * @param  qrs_i_raw
    *   Indices of the peaks.
    * @param  ecg
    *   ECG signal values.
    * @param  frequency
    *   Sampling frequency.
    
### frequency\_bands (cubic\_spline)

    * Calculates percentage of frequency bands HF, LF, VLF and ULF by summing values in each range. 
    *
    * @param  cubic_spline
    *   Cubic interpolated data of the first tenth after FFT is made and cut in half.
    
### heart\_rate\_string\_classes (heart\_rate)

    * Returns string of one of 16 classes (from 'sub_60' to 'over_200').
    *
    * @param  heart_rate
    *   Single heart rate.
    
### add\_heart\_rate\_to\_BPM\_object (heart\_rate, BPM)

    * Assigns 'heart_rate' to one of 16 classes and adds it to BPM object, which is returned.
    *
    * @param  heart_rate
    *   Single heart rate.
    * @param  BPM
    *   BPM object.
    
### add\_heart\_rate\_to\_training\_BPM\_object (heart\_rate, training\_BPM, resting\_HR, max\_HR)

    * Assigns 'heart_rate' to one of 4 classes (recovery, aerobic, anaerobic, red line).
    * The limits for classes are adapted from:
    * 'https://github.com/ehrscape/R-project/blob/master/HeartBeat-walkthrough.md'
    *
    * @param  heart_rate
    *   Single heart rate.
    * @param  training_BPM
    *   Training BPM object.
    * @param  resting_HR
    *   Patient normal resting heart rate.
    * @param  max_HR
    *   Maximum heart rate (calculated by formula:  max_HR = 205.8 - (0.685 * age)).
    
### differ\_more\_that\_num (data, num)

    * Counts how many times 'data' (RR-interval differences) are bigger than 'num'.
    *
    * @param  data
    *   Array of RR-interval differences.
    * @param  num
    *   Number to compare data to.
    
### eliminate\_unfit\_RR\_intervals (RR\_intervals)

    * Removes heart beats that are under 40 bpm or over 200 bpm.
    *
    * @param  RR_intervals
    *   Array of RR-intervals (in seconds).
    
### sample\_standard\_deviation (data, average\_of\_data)

    * Calculates and returns sample standard deviation of 'data'.
    *
    * @param  data
    *   Data to calculate sample standard deviation on.
    * @param  average_of_data
    *   Average of this data.
    
### make\_signal\_length\_power\_of\_2 (ecg)

    * Makes the signal length a potency of 2, adding zeros at the end.
    *
    * @param  ecg
    *   ECG signal values (might be interpoled before).
    
