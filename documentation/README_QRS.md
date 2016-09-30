# QRS Detection Algorithm
***

## The algorithm detects QRS complexes and calculates R-R intervals and heart rate.

***

## Functions

### read\_data (filename)

    * Reads the binary file, reads coefficints from the file and executes QRS algrithm.
    *
    * @param  filename
    *   String name of the .mat file to process.

### QRS\_algorithm (ecg, frequency)

    * Executes QRS detection algorithm (modified Pan-Tompkins algorithm).
    *
    * @param  ecg
    *   Int16Array of raw ECG data.
    * @param  frequency
    *   Sampling frequency.
    
### findpeaks\_windows (vector, min\_distance, min\_or\_max, frequency)

    * Cuts vector into 10-second windows, findpeaks on 10-second interval and adds it to all peaks.
    * The last window may be shorter than 10 seconds, if found only one peak in this window it does not add it to all because it is probably not right.
    *
    * @param  vector
    *   Array of data (vector of numbers).
    * @param  min_distance
    *   Minimal distance between two peaks.
    * @param  min_or_max
    *   String which tells if beats are oriented up ("max") or down ("min").
    * @param  frequency
    *   Sampling frequency.
    
### delete\_duplicates (indices, frequency)

    * First deletes peaks that differ only by one sample (which may happen if the peak is at window divider).
    * Then deletes peaks that are too close, in the range of 0.25*frequency.
    *
    * @param  indices
    *   Indices of the found peaks.
    * @param  frequency
    *   Sampling frequency.

### plot\_data (byteArray, chart\_id, title, vertical\_lines, frequency)

    * Plots the data with linear chart to HTML file.
    *
    * @param  byteArray
    *   Int16Array of ECG data.
    * @param  chart_id
    *   ID of a chart in HTML file.
    * @param  title
    *   String title of the chart.
    * @param  vertical_lines
    *   Vertical lines of found QRS complexes, only present in the last graph.
    * @param  frequency
    *   Sampling frequency.
    
### plot\_graphs (ecg, ecg\_h, ecg\_m, vertical\_lines, frequency)

    * Plots four graphs with given data.
    *
    * @param  ecg
    *   Raw ECG data.
    * @param  ecg_h
    *   Filtered ECG data.
    * @param  ecg_m
    *   Squared ECG data.
    * @param  vertical_lines
    *   Vertical lines of found QRS complexes, only present in the last graph.
    * @param  frequency
    *   Sampling frequency.
    
### make\_vertical\_QRS\_lines (qrs\_i\_raw)

    * Returns vertical lines objects for plotting lines at the last graph.
    *
    * @param  qrs_i_raw
    *   Indices of the peaks in raw ECG signal.
    
### readTextFile (file)

    * Reads and saves data separated by new lines from file to the global variable 'all_coefficients'.
    *
    * @param  file
    *   String name of the file.
    
### RR\_intervals\_and\_heart\_rate (qrs\_i\_raw, frequency)

    * Calculates R-R intervals from 'qrs_i_raw' and calculates heart rate from their average. Shows results on the screen.
    *
    * @param  qrs_i_raw
    *   Indices of the peaks in raw ECG signal.
    * @param  frequency
    *   Sampling frequency.
    
### find\_delays (ecg, ecg\_h, frequency)

    * Searches for peaks on raw and filtered data, calculates and returns delays.
    *
    * @param  ecg
    *   Raw ECG data.
    * @param  ecg_h
    *   Filtered ECG data.
    * @param  frequency
    *   Sampling frequency.
    
### sort\_array\_increasing (arr)

    * Sorts array increasingly.
    *
    * @param  arr
    *   Array to sort.
    
### check\_frequency (frequency)

    * Checks if frequeny is between 100-2000 Hz. If it's not, throws error.
    *
    * @param  frequency
    *   Sampling frequency.
    
### invert\_signal (vector)

    * Mirrors tha signal on the axis x.
    *
    * @param  vector
    *   Array of data (vector of numbers).
    
### are\_beats\_oriented\_up (vector) 

    * Determines if beats are oriented up or down, according to the values of the signal. 
    *
    * @param  vector
    *   Array of data (vector of numbers).

### filter (b, a, x)

    * Equivalent to MATLAB function 'filter'.
    *
    * @param  b
    *   Coefficients.
    * @param  a
    *   Coefficients.
    * @param  x
    *   Input data.

### diff (vector)

    * Equivalent to MATLAB function 'diff'. Calculates differences between adjacent elements of 'vector'.
    *
    * @param  vector
    *   Array of data (vector of numbers).

### mean (vector)

    * Equivalent to MATLAB function 'mean'. Returns the average of the elements in 'vector'.
    *
    * @param  vector
    *   Array of data (vector of numbers).

### conv (u, v)

    * Equivalent to MATLAB function 'conv'. Convolves two vectors that represent polynoms coefficients.
    *
    * @param  u
    *   Vector of one polynom coefficients.
    * @param  v
    *   Vector of another polynom coefficients.
    
### sort\_object\_array (indices, values)

    * Given the indices and values, creates an array of objects sorted by indices.
    *
    * @param  indices
    *   Indices of the peaks in the signal.
    * @param  values
    *   Values of the peaks in the signal.
    
### findpeaks (vector, min\_distance)

    * Returns indices and values of the local peaks of the input signal vector.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  min_distance			
    *   Minimum separation between the peaks.
    
### find\_peak (vector, checked)

    * Finds the highest value (peak) in the signal if it wasn't already checked.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  checked			
    *   Array of booleans (tells if the index is already checked). 
    
### find\_min\_peak (vector, checked)

    * Finds the lowest value (peak) in the signal if it wasn't already checked.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  checked			
    *   Array of booleans (tells if the index is already checked). 
    
### correct\_findpeaks\_results (indices, values)

    * Eliminates the possible highest peak if it's not the heart beat and deletes unfit peaks.
    *
    * @param  indices
    *   Indices of the peaks in the signal.
    * @param  values
    *   Values of the peaks in the signal. 
    
### all\_checked (boolean\_vector)

    * Checks if all data is checked when searching for peaks.
    *
    * @param  boolean_vector			
    *   Array of booleans (tells if the index is already checked).
    
### vector\_summing (vector, add)

    * Adds the 'add' to all elements in the vector.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  add
    *   Adding value.
    
### vector\_subtraction (vector, subtract)

    * Subtracts the subtract from all elements in the vector.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  subtract
    *   Subtract used for vector subtraction.

### vector\_multiplication (vector, multiplier)

    * Divides all elements in the vector.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  multiplier
    *   Multiplier used for vector multiplication.
    
### vector\_division (vector, divisor)

    * Divides all elements in the vector.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    * @param  divisor
    *   Divisor used for vector division.
    
### vector\_squared (vector)

    * Squares all elements in the vector.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    
### vector\_absolute (vector)

    * Returns new vector with absolute values of 'vector'.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    
### vector\_max (vector)

    * Finds and returns the maximum value in 'vector'.
    *
    * @param  vector			
    *   Array of data (vector of numbers).
    
### vector\_max\_with\_index (vector)

    * Finds and returns the maximum value and its index in 'vector'.
    *
    * @param  vector
    *   Array of data (vector of numbers). 
    
### cut\_vector (vector, start, end)

    * Returns new vector, containing elements from 'start' to 'end' index included.
    *
    * @param  vector
    *   Array of data (vector of numbers). 
    * @param  start
    *   Starting index of the new vector.
    * @param  end
    *   Ending index of the new vector (included).
    