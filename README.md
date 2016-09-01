# __JavaScript decoder for SCP-ECG protocol__
***

## SCP-ECG protocol is organized in 12 sections, each containing different data. Section 5 and 6 are usually encoded/compressed. 

[SCP-ECG Data Structure](https://www.hindawi.com/journals/ijta/2010/137201/tab1/ "SCP-ECG Data Structure")
***

## <span style="color:red"> Functions </span>

### <span style="color:blue"> function </span> read_data (filename)

    * Reads the binary file, executes decompression and saves all data.
    *
    * @param  filename
    *   String name of the .scp file to process.

### <span style="color:blue"> function </span> log\_the_results ()

    * Prints all saved data to console.

### <span style="color:blue"> function </span> value\_from\_array\_of_bytes (n, byteArray)

    * Reads and returns decimal value of n consecutive bytes from byteArray
    *
    * @param  n
    *   Number of bytes.
    * @param  byteArray
    *   Array of all bytes in record.
    
### <span style="color:blue"> function </span> bin\_2_dec (bin)

    * Changes little endian binary array to one decimal value.
    *
    * @param  bin
    *   Array of binary values.

### <span style="color:blue"> function </span> add\_name\_and\_value\_to_object (propertyName, propertyValue, obj)

    * Adds new key and its value to an object and returns it.
    *
    * @param  propertyName
    *   Name of the property/key.
    * @param  propertyValue
    *   Value of the property/key.
    * @param  obj
    *   Object to which we add.
    
### <span style="color:blue"> function </span> read\_and\_save\_section\_header (section_ID, byteArray)

    * Reads and saves section header to global objects.
    *
    * @param  section_ID
    *   ID of a section (from 0 to 11).
    * @param  byteArray
    *   Array of all bytes in record.
    
### <span style="color:blue"> function </span> read\_and\_save\_section\_0_info (byteArray)

    * Saves info about sections to global array of objects section_0_data.
    *
    * @param  byteArray
    *   Array of all bytes in record.
    
### <span style="color:blue"> function </span> section\_1\_info_tags ()

    * Save info about tags in Section 1 to global object section_1_tags.
    
### <span style="color:blue"> function </span> section\_1\_read\_tags_content (byteArray)

    * Saves info about patient and ECG data to global object patient_and_ecg_data.
    *
    * @param  byteArray
    *   Array of all bytes in record.
    
### <span style="color:blue"> function </span> read\_and\_save\_AcquiringDeviceIdentificationNumber (byteArray)

    * Saves data in Section 1 to object AcquiringDeviceIdentificationNumber, which is part of object patient_and_ecg_data.
    *
    * @param  byteArray
    *   Array of all bytes in record.
    
### <span style="color:blue"> function </span> read\_and\_save\_Huffman_data (byteArray)

    * Saves data for Huffman tables to an array of objects huffmanTablesList (if Huffman encoding is not default).
    *
    * @param  byteArray
    *   Array of all bytes in record.
    
### <span style="color:blue"> function </span> read\_and\_save\_ECG\_Lead_Definitions (byteArray)

    * Saves data from Section 3 to global object ECG_Lead_Definition.
    *
    * @param  byteArray
    *   Array of all bytes in record. 

### <span style="color:blue"> function </span> read\_and\_save\_QRS_locations (byteArray)

    * Saves data from Section 4 to global object QRS_locations.
    *
    * @param  byteArray
    *   Array of all bytes in record. 

### <span style="color:blue"> function </span> read\_and\_save\_sections\_5\_6\_info (byteArray, section_id)

    * If section_id equals 5, saves encoded reference beat data and other info to global object encoded_reference_beat_data.
    * If section_id equals 6, saves encoded rhythm data and other info to global object encoded_rhythm_data.
    *
    * @param  byteArray
    *   Array of all bytes in record. 
    * @param  section_id
    *   ID of a section (sholud be 5 or 6).

### <span style="color:blue"> function </span> HuffmanDecoder (bytesToDecompress, differenceDataUsed, multiplier, numberOfHuffmanTables, huffmanTablesList, nSamples)

    * With his inner written functions decodes compressed data and return decompressed values in an array (for each lead).
    *
    * @param  bytesToDecompress			
    *   The compressed data.
    * @param  differenceDataUsed			
    *   0 = no, 1 = 1 difference value, 2 = 2 difference values
    * @param  multiplier				    
    *   A value by which to scale the decoded values.
    * @param  numberOfHuffmanTables		
    *   How many tables are available for use.
    * @param  huffmanTablesList			
    *   The Huffman tables themselves.
    * @param  nSamples                    
    *   Number of samples to decode.

### <span style="color:blue"> function </span> decompressReferenceBeatData ()

    * Decompresses reference beat data (from Section 5) with HuffmanDecoder and saves it to global object decompressedReferenceBeatData.
    
### <span style="color:blue"> function </span> decompressRhythmData ()

    * Decompresses rhythm data (from Section 6) with HuffmanDecoder' function decode() and saves it to global object decompressedRhythmData.
    
### <span style="color:blue"> function </span> read\_and\_save\_global_measurements (byteArray, sectionBytesRemaining)

    * Saves data from Section 7 to global object global_measurements.
    *
    * @param  byteArray			
    *   Array of all bytes in record. 
    * @param  sectionBytesRemaining			
    *   Length of the section without the header.  
    
### <span style="color:blue"> function </span> read\_and\_save\_section\_8\_or\_11\_info (byteArray, sectionBytesRemaining, section_id)

    * If section_id equals 8, saves all data to global object section_8_data.
    * If section_id equals 11, saves all data to global object section_11_data.
    *
    * @param  byteArray			
    *   Array of all bytes in record. 
    * @param  sectionBytesRemaining			
    *   Length of the section without the header. 
    * @param  section_id
    *   ID of a section (sholud be 8 or 11).
    
### <span style="color:blue"> function </span> read\_and\_save\_section_10 (byteArray, sectionBytesRemaining)

    * Saves data from Section 10 to global object section_10_data.
    *
    * @param  byteArray			
    *   Array of all bytes in record. 
    * @param  sectionBytesRemaining			
    *   Length of the section without the header. 