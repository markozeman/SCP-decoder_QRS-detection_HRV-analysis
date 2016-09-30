/**
 * 
 * Author: Marko Zeman
 * 
 * Adapted from Java code written by 'dclunie'
 * 
 * */

var SCP = {};

(function (SCP) {

    /** GLOBAL variables */

    var curr_byte = -1;
    
    // sections
    var sections_crc = Array(12).fill(-1);                // 2B
    var sections_ID_number = Array(12).fill(-1);          // 2B
    var sections_length = Array(12).fill(-1);             // 4B
    var sections_version_number = Array(12).fill(-1);     // 1B 
    var sections_protocol_number = Array(12).fill(-1);    // 1B
    //var sections_reserved = Array(12).fill(-1);         // 6B
    
    
    // Section 0 Data
    var section_0_data = [];
    
    
    // Section 1
    var section_1_tags = [];
    var patient_and_ecg_data = {};
    
    
    // Section 2
    var numberOfHuffmanTables = -1;
    var huffmanTablesList = [];
    
    
    // Section 3
    var ECG_Lead_Definition = {};
    
    
    // Section 4
    var QRS_locations = {};
    
    
    // Section 5
    var encoded_reference_beat_data = {};
    var decompressedReferenceBeatData = [];
    
    
    // Section 6
    var encoded_rhythm_data = {};
    var decompressedRhythmData = [];
    
    // HuffmanDecoder global functions
    var reverseBits;
    var swapSuppliedHuffmanTableBaseCodes;
    var getEnoughBits;
    var loadHuffmanTableInUse;
    var decode;
    var decode_data;
    
    
    // Section 7
    var global_measurements = {};
    
    
    // Section 8
    var section_8_data = {};
    
    
    // Section 10
    var section_10_data = {};
    
    
    // Section 11
    var section_11_data = {};
    
    
    // Data for plotting
    var plot_data = {};
    
    /** GLOBAL variables */
    
    
    
    
    var main = function() {
        
        read_data("testing_examples/Example.scp");
        
    };
    
    $(document).ready(main);
    
    
    function parse_data(byteArray) {
                //Record header (6B)
            var record_crc = value_from_array_of_bytes(2, byteArray);
            var record_length = value_from_array_of_bytes(4, byteArray);
            //console.log("Record crc: "+record_crc);
            //console.log("Record length: "+record_length);
            
            //Section 0 header (16B)
            read_and_save_section_header(0, byteArray);
            
            for (var i = 22; i < byteArray.byteLength; i++) {
                //Section 0
                if (i < sections_length[0]+6) {     //Section 0 length + record header length (6B) 
                    if (i % 10 == 2) {      //start of data for new section
                        read_and_save_section_0_info (byteArray);
                    }
                }
                
                //Section 1
                else if (i < section_0_data[1].Starting_Index + section_0_data[1].Length -1) {
                    if (i == section_0_data[1].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[1].ID_number, byteArray);
                        section_1_info_tags();
                        i += 15;
                    }
                    //Section 1 - data
                    else {      //start of section data
                        var bytes_read = section_1_read_tags_content(byteArray);
                        if (bytes_read == -1) {     //terminator
                            i = section_0_data[2].Starting_Index - 2;
                        }
                        else {      //one of 36 tags
                            i += bytes_read-1;
                            curr_byte = i;
                        }
                    }
                }
                
                //Section 2
                else if ((section_0_data[2].Length != 0) && (i < section_0_data[2].Starting_Index + section_0_data[2].Length -1)) {
                    if (i == section_0_data[2].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[2].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 2 - data
                    else if (i == section_0_data[2].Starting_Index+15) {      //start of section data
                        numberOfHuffmanTables = value_from_array_of_bytes (2, byteArray);
                    }
                    else {      //read Huffman tables
                        if (numberOfHuffmanTables != 19999) {
                            while (i < section_0_data[4].Starting_Index-1) {
                                var bytes_read = read_and_save_Huffman_data(byteArray);
                                i += bytes_read-1;
                            }
                        }
                    }
                }
                
                //Section 3
                else if (i < section_0_data[3].Starting_Index + section_0_data[3].Length -1) {
                    if (i == section_0_data[3].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[3].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 3 - data
                    else if (i == section_0_data[3].Starting_Index+15) {      //start of section data
                        var numberOfLeads = read_and_save_ECG_Lead_Definitions(byteArray);
                        i += numberOfLeads*9 +1;
                    }
                }
                
                //Section 4
                else if ((section_0_data[4].Length != 0) && (i < section_0_data[4].Starting_Index + section_0_data[4].Length -1)) {
                    if (i == section_0_data[4].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[4].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 4 - data
                    else if (i == section_0_data[4].Starting_Index+15) {      //start of section data
                        read_and_save_QRS_locations (byteArray);
                    }
                }
                
                //Section 5
                else if ((section_0_data[5].Length != 0) && (i < section_0_data[5].Starting_Index + section_0_data[5].Length -1)) {
                    var number_Of_Leads = ECG_Lead_Definition.numberOfLeads;
                    if (i == section_0_data[5].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[5].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 5 - data
                    else if (i == section_0_data[5].Starting_Index+15) {      //start of section data
                        var totalBytesinCompressedLeadData = read_and_save_sections_5_6_info(byteArray, 5);
                        i += parseInt(4 + number_Of_Leads*2 + totalBytesinCompressedLeadData);   //increase i so in the next loop it will be the last byte of this section
                    }
                }
                
                //Section 6
                else if (i < section_0_data[6].Starting_Index + section_0_data[6].Length -1) {
                    var number_Of_Leads = ECG_Lead_Definition.numberOfLeads;
                    if (i == section_0_data[6].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[6].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 6 - data
                    else if (i == section_0_data[6].Starting_Index+15) {      //start of section data
                        var totalBytesinCompressedLeadData = read_and_save_sections_5_6_info(byteArray, 6);
                        i += parseInt(4 + number_Of_Leads*2 + totalBytesinCompressedLeadData);   //increase i so in the next loop it will be the last byte of this section
                    }
                }
                
                //Section 7
                else if ((section_0_data[7].Length) != 0 && (i < section_0_data[7].Starting_Index + section_0_data[7].Length -1)) {
                    if (i == section_0_data[7].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[7].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 7 - data
                    else if (i == section_0_data[7].Starting_Index+15) {      //start of section data
                        var sectionBytesRemaining = section_0_data[7].Length - 16;    //length of the section without header
                        read_and_save_global_measurements (byteArray, sectionBytesRemaining);
                    }
                }
                
                //Section 8
                else if ((section_0_data[8].Length) != 0 && (i < section_0_data[8].Starting_Index + section_0_data[8].Length -1)) {
                    if (i == section_0_data[8].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[8].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 8 - data
                    else if (i == section_0_data[8].Starting_Index+15) {      //start of section data
                        var sectionBytesRemaining = section_0_data[8].Length - 16;    //length of the section without header
                        read_and_save_section_8_or_11_info(byteArray, sectionBytesRemaining, 8);
                    }
                }
                
                //Section 9
                else if ((section_0_data[9].Length != 0) && (i < section_0_data[9].Starting_Index + section_0_data[9].Length -1)) {
                    if (i == section_0_data[9].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[9].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 9 - data
                    else if (i == section_0_data[9].Starting_Index+15) {      //start of section data
                        // not implemented
                    }
                }
                
                //Section 10
                else if ((section_0_data[10].Length != 0) && (i < section_0_data[10].Starting_Index + section_0_data[10].Length -1)) {
                    if (i == section_0_data[10].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[10].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 10 - data
                    else if (i == section_0_data[10].Starting_Index+15) {      //start of section data
                        var sectionBytesRemaining = section_0_data[10].Length - 16;    //length of the section without header
                        read_and_save_section_10(byteArray, sectionBytesRemaining);
                    }
                }
                
                //Section 11
                else if ((section_0_data[11].Length != 0) && (i < section_0_data[11].Starting_Index + section_0_data[11].Length -1)) {
                    if (i == section_0_data[11].Starting_Index-1) {    //start of section header
                        curr_byte = i-1;
                        read_and_save_section_header(section_0_data[11].ID_number, byteArray);
                        i += 15;
                    }
                    //Section 11 - data
                    else if (i == section_0_data[11].Starting_Index+15) {      //start of section data
                        var sectionBytesRemaining = section_0_data[11].Length - 16;    //length of the section without header
                        read_and_save_section_8_or_11_info(byteArray, sectionBytesRemaining, 11);
                    }
                }
                
                //possible extra Section
                else if ((section_0_data.length > 12) && (i < section_0_data[12].Starting_Index + section_0_data[12].Length -1)) {
                    console.warn("Extra section !");
                    break;
                }
                
                else {
                    console.warn("Error in indexes of byteArray !");
                }
            }
            
            // decompressing data
            decompressReferenceBeatData();
            decompressRhythmData();
            
            // save data to global object plot_data
            save_plot_data ();
            
            // show ECG info
            log_the_results();
            
            return plot_data;
    }
    
    
    
    function read_data (filename) {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", filename, true);
        oReq.responseType = "arraybuffer";
        
        oReq.onload = function (oEvent) {
          var arrayBuffer = oReq.response;
          
          if (arrayBuffer) {
            var byteArray = new Uint8Array(arrayBuffer);
            
            var d = parse_data(byteArray);
            //console.log(d);
          }
        };
        
        oReq.send(null);
    }
    
    
    
    function save_plot_data () {
        var start_numbers = ECG_Lead_Definition.numbersOfSamples;
        var numbersOfSamples = new Array(12);
        
        var sequential_lead_names = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
        var lead_names = ECG_Lead_Definition.leadNames;
        
        var rhythm_data = new Array(12);
        for (var i=0; i<lead_names.length; i++) {
            for (var j=0; j<sequential_lead_names.length; j++) {
                if (lead_names[i] == sequential_lead_names[j]) {
                    rhythm_data[j] = decompressedRhythmData[i];
                    numbersOfSamples[j] = start_numbers[i];
                    break;
                }
            }
        }
        
        var patient_data = {
            LastName: patient_and_ecg_data.LastName,
            Sex: patient_and_ecg_data.Sex,
            Race: patient_and_ecg_data.Race,
            DateOfBirth: patient_and_ecg_data.DateOfBirth,
            DateOfAcquisition: patient_and_ecg_data.DateOfAcquisition,
            PatientIdentificationNumber: patient_and_ecg_data.PatientIdentificationNumber
        };
        
        var ecg_data = {
            leadsAllSimultaneouslyRecorded: ECG_Lead_Definition.leadsAllSimultaneouslyRecorded,
            numbersOfSamples: numbersOfSamples,
            sampleTimeInterval: encoded_rhythm_data.sampleTimeInterval
        };
        
        plot_data = {
            ECG_data: ecg_data,
            Patient_data: patient_data,
            Rhythm_data: rhythm_data
        };
    }
    
    
    
    function log_the_results () {
        console.log("Section 0 data");
        console.log(section_0_data);
        
        console.log("Section 1 - tags");
        console.log(section_1_tags);
        
        console.log("Patient and ECG data - Section 1");
        console.log(patient_and_ecg_data);
        
        console.log("Huffman Tables List - Section 2");
        console.log(huffmanTablesList);
        
        console.log("ECG Lead Definition - Section 3");       
        console.log(ECG_Lead_Definition);
        
        console.log("QRS locations - Section 4");       
        console.log(QRS_locations);
        
        console.log("Encoded Reference Beat Data and other info - Section 5");
        console.log(encoded_reference_beat_data);
        
        console.log("Decoded Reference Beat Data - Section 5");
        console.log(decompressedReferenceBeatData);
        
        console.log("Encoded Rhythm Data and other info - Section 6");
        console.log(encoded_rhythm_data);
        
        console.log("Decoded Rhythm Data - Section 6");
        console.log(decompressedRhythmData);
        
        console.log("Global measurements - Section 7");
        console.log(global_measurements);
        
        console.log("Section 8 data");
        console.log(section_8_data);
        
        console.log("Section 10 data");
        console.log(section_10_data);
        
        console.log("Section 11 data");
        console.log(section_11_data);
        
        console.log("Sections");
        console.log(sections_crc);
        console.log(sections_ID_number);
        console.log(sections_length);
        console.log(sections_version_number);
        console.log(sections_protocol_number);
        //console.log(sections_reserved);
        
        console.log("Plot Data");
        console.log(plot_data);
    }
    
    
    
    function read_and_save_section_10 (byteArray, sectionBytesRemaining) {
        //names of keys in an object
        var names = ["numberOfLeads", "manufacturerSpecific", "leadID", "lengthOfRecord", "Pduration", "PRInterval", "QRSDuration", "QTInterval", "QDuration", "RDuration", "SDuration", "RPrimeDuration",
                     "SPrimeDuration", "QAmplitude", "RAmplitude", "SAmplitude", "RPrimeAmplitude", "SPrimeAmplitude", "JPointAmplitude", "PPlusAmplitude", "PMinusAmplitude", "TPlusAmplitude",
                     "TMinusAmplitude", "STSlope", "PMorphology", "TMorphology", "isoElectricSegmentAtQRSOnset", "isoElectricSegmentAtQRSEnd", "intrinsicoidDeflection", "qualityCode", 
                     "STAmplitudeJPointPlus20ms", "STAmplitudeJPointPlus60ms", "STAmplitudeJPointPlus80ms", "STAmplitudeJPointPlusSixteenthAverageRRInterval", "STAmplitudeJPointPlusEighthAverageRRInterval"];
        
        var numberOfLeads = value_from_array_of_bytes(2, byteArray);
    	var manufacturerSpecific = value_from_array_of_bytes(2, byteArray);
    	sectionBytesRemaining -= 4;
        
        var leadID = new Array(numberOfLeads);
    	var lengthOfRecord = new Array(numberOfLeads);
    	
    	// Set to missing values explicitly, since not all measurements may be encoded
    	var Pduration = Array(numberOfLeads).fill(29999);
    	var PRInterval = Array(numberOfLeads).fill(29999);
    	var QRSDuration = Array(numberOfLeads).fill(29999);
    	var QTInterval = Array(numberOfLeads).fill(29999);
    	var QDuration = Array(numberOfLeads).fill(29999);
    	var RDuration = Array(numberOfLeads).fill(29999);
    	var SDuration = Array(numberOfLeads).fill(29999);
    	var RPrimeDuration = Array(numberOfLeads).fill(29999);
    	var SPrimeDuration = Array(numberOfLeads).fill(29999);
    	var QAmplitude = Array(numberOfLeads).fill(29999);
    	var RAmplitude = Array(numberOfLeads).fill(29999);
    	var SAmplitude = Array(numberOfLeads).fill(29999);
    	var RPrimeAmplitude = Array(numberOfLeads).fill(29999);
    	var SPrimeAmplitude = Array(numberOfLeads).fill(29999);
    	var JPointAmplitude = Array(numberOfLeads).fill(29999);
    	var PPlusAmplitude = Array(numberOfLeads).fill(29999);
    	var PMinusAmplitude = Array(numberOfLeads).fill(29999);
    	var TPlusAmplitude = Array(numberOfLeads).fill(29999);
    	var TMinusAmplitude = Array(numberOfLeads).fill(29999);
    	var STSlope = Array(numberOfLeads).fill(29999);
    	var PMorphology = Array(numberOfLeads).fill(29999);
    	var TMorphology = Array(numberOfLeads).fill(29999);
    	var isoElectricSegmentAtQRSOnset = Array(numberOfLeads).fill(29999);
    	var isoElectricSegmentAtQRSEnd = Array(numberOfLeads).fill(29999);
    	var intrinsicoidDeflection = Array(numberOfLeads).fill(29999);
    	var qualityCode = Array(numberOfLeads).fill(29999);
    	var STAmplitudeJPointPlus20ms = Array(numberOfLeads).fill(29999);
    	var STAmplitudeJPointPlus60ms = Array(numberOfLeads).fill(29999);
    	var STAmplitudeJPointPlus80ms = Array(numberOfLeads).fill(29999);
    	var STAmplitudeJPointPlusSixteenthAverageRRInterval = Array(numberOfLeads).fill(29999);
    	var STAmplitudeJPointPlusEighthAverageRRInterval = Array(numberOfLeads).fill(29999);
        
        var signed_var;
        var i = 0;
    	while (sectionBytesRemaining > 0 && i < numberOfLeads) {
    		leadID[i] = value_from_array_of_bytes(2, byteArray);
            signed_var = new Int8Array([leadID[i]]);
            leadID[i] = signed_var[0];
    		
    		lengthOfRecord[i] = value_from_array_of_bytes(2, byteArray);
            signed_var = new Int8Array([lengthOfRecord[i]]);
            lengthOfRecord[i] = signed_var[0];
    		
    		sectionBytesRemaining -= 4;
    		
    		var remaining = lengthOfRecord[i];
    		if (remaining <= 0) {
    			console.warn("Section 10 Length of record for Lead " + i + " invalid, specified as " + lengthOfRecord[i]
    				         + " dec bytes, so give up on section, though " + sectionBytesRemaining + " dec bytes remaining");
    			break;
    		}
    		if (remaining > sectionBytesRemaining) {
    			console.warn("Section 10 Length of record for Lead " + i + " is " + remaining +
    				         " which is larger than left in section " + sectionBytesRemaining + " dec bytes, so give up on section");
    			break;
    		}
    		
    		if (remaining >= 2) {
    		    Pduration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([Pduration[i]]);
                Pduration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    PRInterval[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([PRInterval[i]]);
                PRInterval[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    QRSDuration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([QRSDuration[i]]);
                QRSDuration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    QTInterval[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([QTInterval[i]]);
                QTInterval[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    QDuration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([QDuration[i]]);
                QDuration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    RDuration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([RDuration[i]]);
                RDuration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    SDuration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([SDuration[i]]);
                SDuration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    RPrimeDuration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([RPrimeDuration[i]]);
                RPrimeDuration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    SPrimeDuration[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([SPrimeDuration[i]]);
                SPrimeDuration[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    QAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([QAmplitude[i]]);
                QAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    RAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([RAmplitude[i]]);
                RAmplitude[i] = signed_var[0]; 
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    SAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([SAmplitude[i]]);
                SAmplitude[i] = signed_var[0]; 
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    RPrimeAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([RPrimeAmplitude[i]]);
                RPrimeAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		} 
    		if (remaining >= 2) {
    		    SPrimeAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([SPrimeAmplitude[i]]);
                SPrimeAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    JPointAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([JPointAmplitude[i]]);
                JPointAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    PPlusAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([PPlusAmplitude[i]]);
                PPlusAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    PMinusAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([PMinusAmplitude[i]]);
                PMinusAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2;
    		}
    		if (remaining >= 2) {
    		    TPlusAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([TPlusAmplitude[i]]);
                TPlusAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    TMinusAmplitude[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([TMinusAmplitude[i]]);
                TMinusAmplitude[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    STSlope[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([STSlope[i]]);
                STSlope[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    PMorphology[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([PMorphology[i]]);
                PMorphology[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    TMorphology[i]  = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([TMorphology[i]]);
                TMorphology[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    isoElectricSegmentAtQRSOnset[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([isoElectricSegmentAtQRSOnset[i]]);
                isoElectricSegmentAtQRSOnset[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    isoElectricSegmentAtQRSEnd[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([isoElectricSegmentAtQRSEnd[i]]);
                isoElectricSegmentAtQRSEnd[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    intrinsicoidDeflection[i] = value_from_array_of_bytes(2, byteArray); 
                signed_var = new Int8Array([intrinsicoidDeflection[i]]);
                intrinsicoidDeflection[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    qualityCode[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([qualityCode[i]]);
                qualityCode[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    STAmplitudeJPointPlus20ms[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([STAmplitudeJPointPlus20ms[i]]);
                STAmplitudeJPointPlus20ms[i] = signed_var[0]; 
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    STAmplitudeJPointPlus60ms[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([STAmplitudeJPointPlus60ms[i]]);
                STAmplitudeJPointPlus60ms[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    STAmplitudeJPointPlus80ms[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([STAmplitudeJPointPlus80ms[i]]);
                STAmplitudeJPointPlus80ms[i] = signed_var[0]; 
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    STAmplitudeJPointPlusSixteenthAverageRRInterval[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([STAmplitudeJPointPlusSixteenthAverageRRInterval[i]]);
                STAmplitudeJPointPlusSixteenthAverageRRInterval[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		if (remaining >= 2) {
    		    STAmplitudeJPointPlusEighthAverageRRInterval[i] = value_from_array_of_bytes(2, byteArray);
                signed_var = new Int8Array([STAmplitudeJPointPlusEighthAverageRRInterval[i]]);
                STAmplitudeJPointPlusEighthAverageRRInterval[i] = signed_var[0];
    		    sectionBytesRemaining-=2;       remaining-=2; 
    		}
    		
    		i++;
    	}
    	
    	if (i != numberOfLeads) {
    		console.warn("Section 10 Number of leads specified as " + numberOfLeads + " but encountered only " + i + " lead measurements");
    	}
        
        //save data into global object (section_10_data)
        for (var i=0; i<names.length; i++) {
            add_name_and_value_to_object(names[i], eval(names[i]), section_10_data);
        }
        
    }
    
    
    
    function read_and_save_section_8_or_11_info (byteArray, sectionBytesRemaining, section_id) {
        var confirmed = value_from_array_of_bytes(1, byteArray);
        var year = value_from_array_of_bytes(2, byteArray);
    	var month = value_from_array_of_bytes(1, byteArray);
    	var day = value_from_array_of_bytes(1, byteArray);
    	var hour = value_from_array_of_bytes(1, byteArray);
    	var minute = value_from_array_of_bytes(1, byteArray);
    	var second = value_from_array_of_bytes(1, byteArray);
    	var numberOfStatements = value_from_array_of_bytes(1, byteArray);
    	sectionBytesRemaining -= 9;
        
        var sequenceNumbers = new Array(numberOfStatements);      //int[]
    	var statementLengths = new Array(numberOfStatements);     //int[]
    	var statements = new Array(numberOfStatements);           //byte[][]
        
        var stat = [];
        var obj = {};
        var i = 0;
    	while (sectionBytesRemaining > 0 && i < numberOfStatements) {
    	    obj = {};
    	    
    		sequenceNumbers[i] = value_from_array_of_bytes(1, byteArray);
    		sectionBytesRemaining--;
    
    		statementLengths[i] = value_from_array_of_bytes(2, byteArray);
    		sectionBytesRemaining -= 2;
    
    		var statementLength = statementLengths[i];				// need to properly parse type and null separated codes if Section 11
    		if (statementLength > 0) {
    			if (statementLength > sectionBytesRemaining) {
    				console.warn("Section " + section_id + " Statement length wanted " + statementLength + " is longer than " + sectionBytesRemaining
    					          + " dec bytes remaining in section, giving up on rest of section");
    			}
    			else {
    				var str = "";
    				for (var j=0; j<statementLength; j++) {
    				    str += String.fromCharCode(value_from_array_of_bytes(1, byteArray));
    				}
    				sectionBytesRemaining -= statementLength;
    				
    				statements[i] = str;
    			}
    		}
    		
    		obj = add_name_and_value_to_object("SequenceNumber", sequenceNumbers[i], obj);
    		obj = add_name_and_value_to_object("StatementLength", statementLengths[i], obj);
    		obj = add_name_and_value_to_object("Statement", statements[i], obj);
    		
    		stat.push(obj);
    		
    		i++;
    	}
    	
    	if (i != numberOfStatements) {
    		console.warn("Section "+ section_id + " Number of statements specified as " + numberOfStatements + " but encountered only " + i + " (valid) statements");
    	}
    	
    	// date - D. M. Y
    	var datum = day + ". " + month + ". " + year;
    	
    	// adding the leading 0 if necessary
        if (hour.toString().length == 1) {
            hour = "0" + hour;
        }
        if (minute.toString().length == 1) {
            minute = "0" + minute;
        }
        if (second.toString().length == 1) {
            second = "0" + second;
        }
        var ura = hour + ":" + minute + ":" + second;
    	
    	
    	//save data into global object (section_8_data or section_11_data)
    	if (section_id == 8) {
            add_name_and_value_to_object("Confirmed", confirmed, section_8_data);   
            add_name_and_value_to_object("Date", datum, section_8_data);
            add_name_and_value_to_object("Time", ura, section_8_data);
            add_name_and_value_to_object("NumberOfStatements", numberOfStatements, section_8_data);
            add_name_and_value_to_object("Statements", stat, section_8_data);
    	}
    	else if (section_id == 11) {
    	    add_name_and_value_to_object("Confirmed", confirmed, section_11_data);   
            add_name_and_value_to_object("Date", datum, section_11_data);
            add_name_and_value_to_object("Time", ura, section_11_data);
            add_name_and_value_to_object("NumberOfStatements", numberOfStatements, section_11_data);
            add_name_and_value_to_object("Statements", stat, section_11_data);
    	}
    	else {
    	    console.warn("Wrong id !");
    	}
    }
    
    
    
    function read_and_save_global_measurements (byteArray, sectionBytesRemaining) {
    	//names of keys in an object
        var names = ["numberOfQRSMeasurements", "numberOfPacemakerSpikes", "averageRRInterval", "averagePPInterval", "QRS_Measurements", "pacemakerSpikeLocation", "pacemakerSpikeAmplitude",
                     "pacemakerSpikeType", "pacemakerSpikeSource", "pacemakerSpikeTriggerIndex", "pacemakerSpikePulseWidth", "numberOfQRSComplexes", "qrsType",
                     "ventricularRate", "atrialRate", "correctedQTInterval", "heartRateCorrectionFormula", "numberOfBytesInTaggedFields"];
        
        // read data
        var numberOfQRSMeasurements = value_from_array_of_bytes(1, byteArray);     // number of reference types or QRSs (plus 1 since Ref. Beat 0 always included)
        var numberOfPacemakerSpikes = value_from_array_of_bytes(1, byteArray);
        var averageRRInterval = value_from_array_of_bytes(2, byteArray);
        var averagePPInterval = value_from_array_of_bytes(2, byteArray);
        sectionBytesRemaining -= 6;
        
        var onsetP = new Array(numberOfQRSMeasurements);	// mS from start of ECG (or from start of reference beat, if a reference beat)
    	var offsetP = new Array(numberOfQRSMeasurements);
    	var onsetQRS = new Array(numberOfQRSMeasurements);
    	var offsetQRS = new Array(numberOfQRSMeasurements);
    	var offsetT = new Array(numberOfQRSMeasurements);
    	var axisP = new Array(numberOfQRSMeasurements);		// in angular degrees, 999 undefined
    	var axisQRS = new Array(numberOfQRSMeasurements);
    	var axisT = new Array(numberOfQRSMeasurements);
    	
    	var QRS_Measurements = new Array(numberOfQRSMeasurements);      // array of objects
        
        for (var i=0; i<numberOfQRSMeasurements; i++) {
            onsetP[i] = value_from_array_of_bytes(2, byteArray);
        	offsetP[i] = value_from_array_of_bytes(2, byteArray);
        	onsetQRS[i] = value_from_array_of_bytes(2, byteArray);
        	offsetQRS[i] = value_from_array_of_bytes(2, byteArray);
        	offsetT[i] = value_from_array_of_bytes(2, byteArray);
        	axisP[i] = value_from_array_of_bytes(2, byteArray);
        	axisQRS[i] = value_from_array_of_bytes(2, byteArray);
        	axisT[i] = value_from_array_of_bytes(2, byteArray);
        	sectionBytesRemaining -= 16;
        	
        	var obj = {
        	    P_Onset: onsetP[i],
        		P_Offset: offsetP[i],
        		QRS_Onset: onsetQRS[i],
        		QRS_Offset: offsetQRS[i],
        		T_Offset: offsetT[i],
        		P_Axis: axisP[i],
        		QRS_Axis: axisQRS[i],
        		T_Axis: axisT[i]
        	};
        	
        	QRS_Measurements[i] = obj;
        }
        
        
        var pacemakerSpikeLocation = new Array(numberOfPacemakerSpikes);
        var pacemakerSpikeAmplitude = new Array(numberOfPacemakerSpikes);
        
        for (var i=0; i<numberOfPacemakerSpikes; i++) {
            pacemakerSpikeLocation[i] = value_from_array_of_bytes(2, byteArray);
            
            // read unsigned and save signed
            pacemakerSpikeAmplitude[i] = value_from_array_of_bytes(2, byteArray); 
            var signed_var = new Int8Array([pacemakerSpikeAmplitude[i]]);
            pacemakerSpikeAmplitude[i] = signed_var[0];
            
            sectionBytesRemaining -= 4;
        }
        
        
        var pacemakerSpikeType = new Array(numberOfPacemakerSpikes);
    	var pacemakerSpikeSource = new Array(numberOfPacemakerSpikes);
    	var pacemakerSpikeTriggerIndex = new Array(numberOfPacemakerSpikes);
    	var pacemakerSpikePulseWidth = new Array(numberOfPacemakerSpikes);
    	
    	for (var i=0; i<numberOfPacemakerSpikes; i++) {
    	    pacemakerSpikeType[i] = value_from_array_of_bytes(1, byteArray);
    	    pacemakerSpikeSource[i] = value_from_array_of_bytes(1, byteArray);
    	    pacemakerSpikeTriggerIndex[i] = value_from_array_of_bytes(2, byteArray);
    	    pacemakerSpikePulseWidth[i] = value_from_array_of_bytes(2, byteArray);
    	    sectionBytesRemaining -= 6;
    	}
        
        
        var numberOfQRSComplexes;
        
        if (sectionBytesRemaining >= 2) {		// if we don't check, may be missing, and we read beyond section
    		numberOfQRSComplexes = value_from_array_of_bytes(2, byteArray);
    		sectionBytesRemaining -= 2;
    	}
    	else {
    		numberOfQRSComplexes = 0;
    		console.warn("Section 7 Number Of QRS Complexes (and everything that follows) missing - end of section encountered first !");
    	}
    	
    	
    	var qrsType = new Array(numberOfQRSComplexes);
        for (var i=0; i<numberOfQRSComplexes; i++) {
            qrsType[i] = value_from_array_of_bytes(1, byteArray);
    		sectionBytesRemaining--;
        }
        
        
        if (sectionBytesRemaining >= 9) {
    		var ventricularRate = value_from_array_of_bytes(2, byteArray);      // beats per minute
    		var atrialRate = value_from_array_of_bytes(2, byteArray);           // beats per minute
    		var correctedQTInterval = value_from_array_of_bytes(2, byteArray);  // milliseconds
    		var heartRateCorrectionFormula = value_from_array_of_bytes(1, byteArray);        // 0-Unknown or unspecified, 1-Bazett, 2-Hodges, 3-127 Reserved, 128-254 Manufacturer specific, 255-Measurement not available
    		var numberOfBytesInTaggedFields = value_from_array_of_bytes(2, byteArray);
    		sectionBytesRemaining -= 9;
    	}
    	else {
    		console.warn("Section 7 Missing extra measurements, giving up on rest of section !");
    	}
    	
    	//save data into global object (global_measurements)
        for (var i=0; i<names.length; i++) {
            add_name_and_value_to_object(names[i], eval(names[i]), global_measurements);
        }
    }
    
    
    
    function decompressRhythmData () {
        if (Object.keys(encoded_rhythm_data).length === 0) {    //if the object is empty, then return
            return;
        }
        
    	var numberOfLeads = ECG_Lead_Definition.numberOfLeads;              //int
    	var numbersOfSamples = ECG_Lead_Definition.numbersOfSamples;        //long[]
    	var referenceBeatUsedForCompression = ECG_Lead_Definition.referenceBeatUsedForCompression;  //boolean
        
        if (Object.keys(QRS_locations).length !== 0) {    //if the object is not empty
            var sampleNumberOfQRSOfFiducial = QRS_locations.sampleNumberOfQRSOfFiducial;      //int
        	var sampleNumberOfResidualToStartSubtractingQRS = QRS_locations.sampleNumberOfResidualToStartSubtractingQRS;    //long[]
        	var sampleNumberOfResidualOfFiducial = QRS_locations.sampleNumberOfResidualOfFiducial;                          //long[]
        	var sampleNumberOfResidualToEndSubtractingQRS = QRS_locations.sampleNumberOfResidualToEndSubtractingQRS;        //long[]
        	var sampleNumberOfResidualToStartProtectedArea = QRS_locations.sampleNumberOfResidualToStartProtectedArea;      //long[]
        	var sampleNumberOfResidualToEndProtectedArea = QRS_locations.sampleNumberOfResidualToEndProtectedArea;          //long[]
        }
        else {      
            var sampleNumberOfQRSOfFiducial = null;
        	var sampleNumberOfResidualToStartSubtractingQRS = null;
        	var sampleNumberOfResidualOfFiducial = null;
        	var sampleNumberOfResidualToEndSubtractingQRS = null;
        	var sampleNumberOfResidualToStartProtectedArea = null;
        	var sampleNumberOfResidualToEndProtectedArea = null;
        }
        
    	
    	var sampleTimeIntervalForReference;
    	if (Object.keys(encoded_reference_beat_data).length === 0) {    //if the object is empty
            sampleTimeIntervalForReference = 0;
        }
        else {
            sampleTimeIntervalForReference = parseInt(encoded_reference_beat_data.sampleTimeInterval.split(" ")[0]);
        }
        
        var amplitudeValueMultiplier = Math.floor(parseInt(encoded_rhythm_data.amplitudeValueMultiplier.split(" ")[0]) / 1000);    //amplitudeValueMultiplier is nanoVolts, not microVolts    
    	var differenceDataUsed = parseInt(encoded_rhythm_data.differenceDataUsed);          //int
    	var compressedLeadData = encoded_rhythm_data.compressedLeadData;                    //byte[][]
    	//var bimodalCompressionUsed = encoded_rhythm_data.bimodalCompressionUsed;          //int
    	var sampleTimeIntervalForRhythm = parseInt(encoded_rhythm_data.sampleTimeInterval.split(" ")[0]);   //int
        
        var samplingRateDecimationFactor = (sampleTimeIntervalForReference == 0) 
    			? 1
    			: sampleTimeIntervalForRhythm / sampleTimeIntervalForReference;
        
        var protectedAreas = (sampleNumberOfResidualToStartProtectedArea == null || sampleNumberOfResidualToEndProtectedArea.length == null)
    			? null
    			: {
    			    start: sampleNumberOfResidualToStartProtectedArea,
    			    end: sampleNumberOfResidualToEndProtectedArea,
    			    numberOfProtectedAreas: sampleNumberOfResidualToStartProtectedArea.length,
    			    
    			    isSampleWithinProtectedArea: function (sample) {
    			        var within=false;
            			for (var area=0; area<this.numberOfProtectedAreas; area++) {
            				if (sample >= this.start[area] && sample <= this.end[area]) {
            					within=true;
            					break;
            				}
            			}
            			return within;
                    }
    			};
    			
    	var referenceBeatSubtractionZones = referenceBeatUsedForCompression
    			? {
    			    numberOfReferenceBeatSubtractionZones: sampleNumberOfResidualToStartSubtractingQRS.length,
    			    fcm: sampleNumberOfQRSOfFiducial,
    			    start: sampleNumberOfResidualToStartSubtractingQRS,
    			    fc: sampleNumberOfResidualOfFiducial,
    			    end: sampleNumberOfResidualToEndSubtractingQRS,
    			    
    			    getSampleOffsetWithinReferenceBeatSubtractionZone: function (sample) {	    // -1 is flag that it is not in the zone
            			for (var qrs=0; qrs<this.numberOfReferenceBeatSubtractionZones; qrs++) {
            				if (sample >= this.start[qrs] && sample <= this.end[qrs]) {
            					var offsetToAlignFiducial = this.fcm - (this.fc[qrs] - this.start[qrs]);
            					var offsetFromStartOfReferenceBeat = sample - this.start[qrs] + offsetToAlignFiducial;	// numbered from zero
            					return offsetFromStartOfReferenceBeat;
            				}
            			}
            			return -1;
            		}
    			  }
    			: null;
    			
    			
    	decompressedRhythmData = new Array(numberOfLeads);
    			
    	for (var lead=0; lead<numberOfLeads; lead++) {
    		decompressedRhythmData[lead] = null;
    		var useNumberOfSamples = Math.floor(numbersOfSamples[lead]);
    		
    		try {
                HuffmanDecoder(compressedLeadData[lead], differenceDataUsed, amplitudeValueMultiplier, numberOfHuffmanTables, huffmanTablesList, 0);    //the last parameter is 0 to only initialize, not to decompress
                
    			{
    				decompressedRhythmData[lead] = new Array(useNumberOfSamples);
    				var value = 0;
    				var decimationOffsetCount = 0;
    				var currentDecimatedValue = 0;
    				
    				for (var sample=1; sample<=useNumberOfSamples; sample++) {
    					var within = protectedAreas != null && protectedAreas.isSampleWithinProtectedArea(sample);
    					if (within) {
    						value = decode();
    						decimationOffsetCount = 0;
    					}
    					else {
    						if (samplingRateDecimationFactor <= 1) {	// should never happen, but if we didn't check, division by zero
    							value = decode();
    						}
    						else {
    							var interpolationOffset = decimationOffsetCount % samplingRateDecimationFactor;
    							
    							if (interpolationOffset == 0) {
    								currentDecimatedValue = decode();
    							}
    							value = Math.floor(currentDecimatedValue);
    						}
    						decimationOffsetCount++;
    					}
    					
    					if (referenceBeatSubtractionZones == null) {
    						decompressedRhythmData[lead][sample-1] = value;
    					}
    					else {
    						var offset = referenceBeatSubtractionZones.getSampleOffsetWithinReferenceBeatSubtractionZone(sample);
    						if (offset != -1) {
    							value += decompressedReferenceBeatData[lead][offset];
    						}
    						decompressedRhythmData[lead][sample-1] = value;
    					}
    				}	
    			}
    		}
    		catch (err) {
    			console.warn(err);
    		}
    	}
        
    }
    
    
    
    function decompressReferenceBeatData () {
        if (Object.keys(encoded_reference_beat_data).length === 0) {    //if the object is empty, then return
            return;
        }
        
        var numberOfLeads = ECG_Lead_Definition.numberOfLeads;
        var lengthOfReferenceBeat0DataInMilliSeconds = QRS_locations.lengthOfReferenceBeat0DataInMilliSeconds;
        
        var amplitudeValueMultiplier = Math.floor(parseInt(encoded_reference_beat_data.amplitudeValueMultiplier.split(" ")[0]) / 1000);    //amplitudeValueMultiplier is in nanoVolts, not microVolts
    	var sampleTimeInterval = parseInt(encoded_reference_beat_data.sampleTimeInterval.split(" ")[0]);
        var differenceDataUsed = parseInt(encoded_reference_beat_data.differenceDataUsed); 
    	var compressedLeadData = encoded_reference_beat_data.compressedLeadData;       //byte[][]
        
        var numberOfSamples = 1000*lengthOfReferenceBeat0DataInMilliSeconds/sampleTimeInterval;
     
        for (var lead=0; lead<numberOfLeads; lead++) {
    		try {
    			var decompressedData = HuffmanDecoder(compressedLeadData[lead], differenceDataUsed, amplitudeValueMultiplier, numberOfHuffmanTables, huffmanTablesList, numberOfSamples);
    			decompressedReferenceBeatData.push(decompressedData);
    		}
    		catch (err) {
    			console.warn(err);
    		}
    	}
    }
    
    
    
    function HuffmanDecoder (bytesToDecompress, differenceDataUsed, multiplier, numberOfHuffmanTables, huffmanTablesList, nSamples) {
    //                       byte[]             int                 int         int                    ArrayList          int
        /**
    	 * @param	bytesToDecompress			the compressed data
    	 * @param	differenceDataUsed			0 = no, 1 = 1 difference value, 2 = 2 difference values
    	 * @param	multiplier				    a value by which to scale the decoded values
    	 * @param	numberOfHuffmanTables		how many tables are available for use
    	 * @param	huffmanTablesList			the Huffman tables themselves
    	 * @param   nSamples                    number of samples to decode
    	 */
        
        var DefaultHuffmanTable = {
            numberOfCodeStructuresInTable: 19,
            numberOfBitsInPrefix: [1, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 10],
            numberOfBitsInEntireCode: [1, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 18, 26],
            tableModeSwitch: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            baseValueRepresentedByBaseCode: [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8, 0, 0],
            baseCode: [0, 1, 5, 3, 11, 7, 23, 15, 47, 31, 95, 63, 191, 127, 383, 255, 767, 511, 1023] 
        };
        
        var extractBitMask = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
        
        var signDetectMask = [0x0000000000000000, 0x0000000000000001, 0x0000000000000002, 0x0000000000000004, 0x0000000000000008,   /* 8 bits */
                              0x0000000000000010, 0x0000000000000020, 0x0000000000000040, 0x0000000000000080,    /* 8 bits */ 
    				          0x0000000000000100, 0x0000000000000200, 0x0000000000000400, 0x0000000000000800,    /* 16 bits */
    				          0x0000000000001000, 0x0000000000002000, 0x0000000000004000, 0x0000000000008000];   /* 16 bits */ 
    				          
    	var signExtendMask = [-0x00, -0xff, -0xfe, -0xfc, -0xf8,    /* 8 bits */
            				  -0xf0, -0xe0, -0xc0, -0x80,           /* 8 bits */
    				          -0xff00, -0xfe00, -0xfc00, -0xf800,   /* 16 bits */
    				          -0xf000, -0xe000, -0xc000, -0x8000];  /* 16 bits */
    				         
        var availableBytes = bytesToDecompress.length;
        var	decompressedValueCount = 0;     // number of values decompressed so far (used to know whether lastValue and secondLastValue loaded)
    	var	byteIndex = 0;
    	var	bitIndex = 8;	// force fetching byte the first time
    	var	haveBits = 0;	// don't have any bits to start with
        
        var currentByte;
    	var currentBits;
        var lastValue;		    // last value decompressed
    	var secondLastValue;	// 2nd last value decompressed
    	
    	var huffmanTableLength;
    	var bitsPerPrefix;
    	var bitsPerEntireCode;
    	var tableModeSwitch;
    	var huffmanPrefixCodes;
    	var valuesRepresentedByCodes;
    	
    	
    	reverseBits = function (src, n) {
    	    var dst = 0;
    		while (n-- > 0) {
    			dst = (dst << 1) | (src & 0x1);
    			src = src >> 1;
    		}
    		return dst;
    	};
    	
    	swapSuppliedHuffmanTableBaseCodes = function (reversedHuffmanPrefixCodes, bitsPerPrefix) {
    		var n = reversedHuffmanPrefixCodes.length;
    		var correctedHuffmanPrefixCodes = new Array(n);
    		for (var i=0; i<n; i++) {
    			correctedHuffmanPrefixCodes[i] = reverseBits(reversedHuffmanPrefixCodes[i], bitsPerPrefix[i]);
    		}
    		return correctedHuffmanPrefixCodes;
    	};
    	
    	getEnoughBits = function (wantBits) {
    		while (haveBits < wantBits) {
    			if (bitIndex > 7) {
    				if (byteIndex < availableBytes) {
    					currentByte = bytesToDecompress[byteIndex++];
    					bitIndex = 0;
    				}
    				else {
    					console.warn("No more bits (having decompressed "+ byteIndex +" dec bytes)");
    				}
    			}
    			var newBit = (currentByte & extractBitMask[bitIndex++]) == 0 ? 0 : 1;
    			currentBits = (currentBits << 1) + newBit;
    			haveBits++;
    		}
    	};
    	
    	loadHuffmanTableInUse = function (number) {
    	    var useHuffmanTable;
    		if (number == 19999) {
    			useHuffmanTable = DefaultHuffmanTable;
    		}
    		else if (huffmanTablesList.length > 0) {
    			useHuffmanTable = huffmanTablesList[number];
    		}
    		
    		huffmanTableLength = useHuffmanTable.numberOfCodeStructuresInTable;
    		bitsPerPrefix = useHuffmanTable.numberOfBitsInPrefix;
    		bitsPerEntireCode = useHuffmanTable.numberOfBitsInEntireCode;
    		tableModeSwitch = useHuffmanTable.tableModeSwitch;
    		valuesRepresentedByCodes = useHuffmanTable.baseValueRepresentedByBaseCode;
    		huffmanPrefixCodes = swapSuppliedHuffmanTableBaseCodes(useHuffmanTable.baseCode, bitsPerPrefix);
    	};
    	
        decode = function () {
    		var value = 0;		// initializer irrelevant but quietens compiler
    		var gotValue = false;
    		do {
    			var tableIndex = 0;
    			while (tableIndex < huffmanTableLength) {
    				var wantPrefixBits = bitsPerPrefix[tableIndex];
    				getEnoughBits(wantPrefixBits);		// modifies currentBits
    				if (currentBits == huffmanPrefixCodes[tableIndex]) {
    					break;
    				}
    				tableIndex++;
    			}
    			if (tableIndex >= huffmanTableLength) {
    				console.warn("Code prefix not in table");
    			}
    			if (tableModeSwitch[tableIndex] == 0) {					// Note that 0 is the flag to switch; 1 indicates no switch
    				var newTableNumber = valuesRepresentedByCodes[tableIndex];	    // The base value is used as the new table number
    				loadHuffmanTableInUse(newTableNumber);
    				continue;
    			}
    			else if (bitsPerPrefix[tableIndex] == bitsPerEntireCode[tableIndex]) {
    				value = valuesRepresentedByCodes[tableIndex];
    			}
    			else {	    // assume greater, else table would be malformed
    				var numberOfOriginalBits = bitsPerEntireCode[tableIndex] - bitsPerPrefix[tableIndex];
    				currentBits=0;
    				haveBits=0;
    				getEnoughBits(numberOfOriginalBits);		// modifies currentBits
    				if ((currentBits & signDetectMask[numberOfOriginalBits]) != 0) {
    					currentBits |= signExtendMask[numberOfOriginalBits];
    				}
    				value = currentBits;
    			}
    			if (differenceDataUsed == 1) {
    				if (decompressedValueCount > 0) {
    					value = (value + lastValue);
    				}
    				// else first value is sent raw (still with Huffman prefix though) leave value alone
    			}
    			else if (differenceDataUsed == 2) {
    				if (decompressedValueCount > 1) {
    					value = (value + 2*lastValue - secondLastValue);
    				}
    				// else first value is sent raw (still with Huffman prefix though) leave value alone
    			}
    			else if (differenceDataUsed != 0) {
    				console.warn("Unrecognized difference encoding method " + differenceDataUsed);
    			}
    			secondLastValue = lastValue;
    			lastValue = value;
    			currentBits = 0;
    			haveBits = 0;
    			decompressedValueCount++;
    			gotValue=true;
    		}  
    		while (!gotValue);
    		
    		value *= multiplier;
    		
    		return value;
    	};
    	
    	decode_data = function (nValuesWanted) {
    		var values = new Array(nValuesWanted);
    		for (var count=0; count<nValuesWanted; count++) {
    			values[count] = decode();
    		}
    		return values;
    	};
        
        // loads values in variables of Huffman table
    	loadHuffmanTableInUse(numberOfHuffmanTables);
    	
        // decompressing data
        var decompressedData = decode_data(Math.floor(nSamples));
        
        return decompressedData;
    }
    
    
    
    function read_and_save_sections_5_6_info (byteArray, section_id) {
        //names of keys in an object
        var names = ["amplitudeValueMultiplier", "sampleTimeInterval", "differenceDataUsed", "bimodalCompressionUsed",
                     "numberOfLeads", "byteLengthsOfEncodedLeads", "totalBytesinCompressedLeadData", "compressedLeadData"];
        
        var amplitudeValueMultiplier = value_from_array_of_bytes(2, byteArray) + " nV";     // nanoVolts
        var sampleTimeInterval = value_from_array_of_bytes(2, byteArray) + " µs";           // microSeconds
        var differenceDataUsed = value_from_array_of_bytes(1, byteArray);                   // 0 = no, 1 = 1st difference, 2 = 2nd difference
        var bimodalCompressionUsed = value_from_array_of_bytes(1, byteArray);               // 0 = no, 1 = yes  /* used only for Section 6, reserved byte for Section 5 */
        
        var numberOfLeads = ECG_Lead_Definition.numberOfLeads;
        
        var byteLengthsOfEncodedLeads = [];         //int[numberOfLeads]
    	var totalBytesinCompressedLeadData = 0;
    	var compressedLeadData = [];                //byte[numberOfLeads][]
    	
    	// for each lead read and save its length
    	for (var i=0; i<numberOfLeads; i++) {
    	    byteLengthsOfEncodedLeads.push(value_from_array_of_bytes(2, byteArray));
    	    totalBytesinCompressedLeadData += byteLengthsOfEncodedLeads[i];
    	}
    	
        // read and saves compressed data
        for (var i=0; i<byteLengthsOfEncodedLeads.length; i++) {
            var arr = new Array(byteLengthsOfEncodedLeads[i]);
            for (var j=0; j<arr.length; j++) {
                arr[j] = value_from_array_of_bytes(1, byteArray); 
            }
            compressedLeadData.push(arr);
        }
    	
    	// save data into global object
    	if (section_id == 5) {
    	    for (var i=0; i<names.length; i++) {
    	        if (i != 3) {       // Section 5 does not have bimodalCompressionUsed
                    add_name_and_value_to_object(names[i], eval(names[i]), encoded_reference_beat_data);          
    	        }
            }
    	}
    	else if (section_id == 6) {
    	    for (var i=0; i<names.length; i++) {
                add_name_and_value_to_object(names[i], eval(names[i]), encoded_rhythm_data);
            }
    	}
    	else {
    	    console.warn("Wrong id !");
    	}
    	
    	return totalBytesinCompressedLeadData;
    }
    
    
    
    function read_and_save_QRS_locations (byteArray) {
        //names of keys in an object
        var names = ["lengthOfReferenceBeat0DataInMilliSeconds", "sampleNumberOfQRSOfFiducial", "totalNumberOfQRSComplexes", "beatType", "sampleNumberOfResidualToStartSubtractingQRS", 
                     "sampleNumberOfResidualOfFiducial", "sampleNumberOfResidualToEndSubtractingQRS", "sampleNumberOfResidualToStartProtectedArea", "sampleNumberOfResidualToEndProtectedArea"];
        
        //  int[]          long[]                                            long[]                                 long[]
        var beatType = [], sampleNumberOfResidualToStartSubtractingQRS = [], sampleNumberOfResidualOfFiducial = [], sampleNumberOfResidualToEndSubtractingQRS = [], 
        //  long[]                                           long[]
            sampleNumberOfResidualToStartProtectedArea = [], sampleNumberOfResidualToEndProtectedArea = [];    
            
        var lengthOfReferenceBeat0DataInMilliSeconds = value_from_array_of_bytes(2, byteArray);
        var sampleNumberOfQRSOfFiducial = value_from_array_of_bytes(2, byteArray);
        var totalNumberOfQRSComplexes = value_from_array_of_bytes(2, byteArray);
        
        for (var i=0; i<totalNumberOfQRSComplexes; i++) {
            beatType.push(value_from_array_of_bytes(2, byteArray));
            sampleNumberOfResidualToStartSubtractingQRS.push(value_from_array_of_bytes(4, byteArray));
            sampleNumberOfResidualOfFiducial.push(value_from_array_of_bytes(4, byteArray));
            sampleNumberOfResidualToEndSubtractingQRS.push(value_from_array_of_bytes(4, byteArray));
        }
        
        for (var i=0; i<totalNumberOfQRSComplexes; i++) {
            sampleNumberOfResidualToStartProtectedArea.push(value_from_array_of_bytes(4, byteArray));
            sampleNumberOfResidualToEndProtectedArea.push(value_from_array_of_bytes(4, byteArray));
        }
            
        // save data into global object (QRS_locations)
        for (var i=0; i<names.length; i++) {
            add_name_and_value_to_object(names[i], eval(names[i]), QRS_locations);
        }
    }
    
    
    
    function read_and_save_ECG_Lead_Definitions (byteArray) {
        var leadNameDictionary = ["Unspecified", "I", "II", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V2R", "V3R", "V4R", "V5R", "V6R", "V7R", "X", "Y", "Z", "CC5", "CM5", "Left Arm",
    		                      "Right Arm", "Left Leg", "I (Frank)", "E", "C", "A", "M", "F", "H", "I -cal",	"II-cal", "V1-cal", "V2-cal", "V3-cal", "V4-cal", "V5-cal", "V6-cal",
    		                      "V7-cal", "V2R-cal", "V3R-cal", "V4R-cal", "V5R-cal", "V6R-cal", "V7R-cal", "X-cal", "Y-cal", "Z-cal", "CC5-cal", "CM5-cal", "Left Arm-cal",
    		                      "Right Arm-cal", "Left Leg-cal", "I-cal (Frank)",	"E-cal", "C-cal", "A-cal", "M-cal", "F-cal", "H-cal", "III", "aVR", "aVL", "aVF", "-aVR", "V8",
    		                      "V9", "V8R", "V9R", "D (Nehb – Dorsal)", "A (Nehb – Anterior)", "J (Nehb – Inferior)", "Defibrillator lead: anterior-lateral", "External pacing lead: anteriorposterior",
    		                      "A1 (Auxiliary unipolar lead 1)", "A2 (Auxiliary unipolar lead 2)", "A3 (Auxiliary unipolar lead 3)", "A4 (Auxiliary unipolar lead 4)", "V8-cal", "V9-cal",	
    		                      "V8R-cal", "V9R-cal", "D-cal (cal for Nehb – Dorsal)", "A-cal (cal for Nehb – Anterior)", "J-cal (cal for Nehb – Inferior)"];
        
        //names of keys in an object
        var names = ["numberOfLeads", "flagByte", "referenceBeatUsedForCompression", "reservedBit1", "leadsAllSimultaneouslyRecorded", "numberOfSimultaneouslyRecordedLeads",
                     "startingSampleNumbers", "endingSampleNumbers", "numbersOfSamples", "leadNumbers", "leadNames"];
        
        //  int            int       boolean                          boolean       boolean                         int
        var numberOfLeads, flagByte, referenceBeatUsedForCompression, reservedBit1, leadsAllSimultaneouslyRecorded, numberOfSimultaneouslyRecordedLeads;
        
        //  long[]                      long[]                    long[]                 int[]             String[]
        var startingSampleNumbers = [], endingSampleNumbers = [], numbersOfSamples = [], leadNumbers = [], leadNames = [];
        
        numberOfLeads = value_from_array_of_bytes(1, byteArray);
        flagByte = value_from_array_of_bytes(1, byteArray);
        
        referenceBeatUsedForCompression = (flagByte & 0x01) != 0;
        reservedBit1 = (flagByte & 0x02) != 0;
        leadsAllSimultaneouslyRecorded = (flagByte & 0x04) != 0;
        numberOfSimultaneouslyRecordedLeads = (flagByte & 0xf8) >> 3;
        
        for (var i=0; i<numberOfLeads; i++) {
            startingSampleNumbers.push(value_from_array_of_bytes(4, byteArray));
            endingSampleNumbers.push(value_from_array_of_bytes(4, byteArray));
            numbersOfSamples.push(endingSampleNumbers[endingSampleNumbers.length-1] - startingSampleNumbers[startingSampleNumbers.length-1] + 1);    //computed
            leadNumbers.push(value_from_array_of_bytes(1, byteArray));
            leadNames.push(leadNameDictionary[leadNumbers[leadNumbers.length-1]]);
        }
        
        // save data into global object (ECG_Lead_Definition)
        for (var i=0; i<names.length; i++) {
            add_name_and_value_to_object(names[i], eval(names[i]), ECG_Lead_Definition);
        }
        
        return numberOfLeads;
    }
    
    
    
    function read_and_save_Huffman_data (byteArray) {
        //names of keys in an object
        var names = ["numberOfCodeStructuresInTable", "numberOfBitsInPrefix", "numberOfBitsInEntireCode", "tableModeSwitch", "baseValueRepresentedByBaseCode", "baseCode"];
        
        var numberOfCodeStructuresInTable = value_from_array_of_bytes(2, byteArray);
        
        var count_bytes = 2;
                      
    	var numberOfBitsInPrefix = new Array(numberOfCodeStructuresInTable);                // int[]
    	var numberOfBitsInEntireCode = new Array(numberOfCodeStructuresInTable);            // int[]
    	var tableModeSwitch = new Array(numberOfCodeStructuresInTable);                     // int[]
    	var baseValueRepresentedByBaseCode = new Array(numberOfCodeStructuresInTable);      // int[]
    	var baseCode = new Array(numberOfCodeStructuresInTable);                            // long[]
    	
    	// read data for every structure
    	for (var i=0; i<numberOfCodeStructuresInTable; i++) {
    	    numberOfBitsInPrefix[i] = value_from_array_of_bytes(1, byteArray);
    	    numberOfBitsInEntireCode[i] = value_from_array_of_bytes(1, byteArray);
    	    tableModeSwitch[i] = value_from_array_of_bytes(1, byteArray);
    	    baseValueRepresentedByBaseCode[i] = value_from_array_of_bytes(2, byteArray);
    	    baseCode[i] = value_from_array_of_bytes(4, byteArray);
    	    count_bytes += 9;
    	}
    	
    	// save data into global array of objects (huffmanTablesList)
    	var HuffmanTable = {};
    	for (var i=0; i<names.length; i++) {
            add_name_and_value_to_object(names[i], eval(names[i]), HuffmanTable);
        }
        huffmanTablesList.push(HuffmanTable);
        
        return count_bytes;
    }
    
    
    
    function read_and_save_AcquiringDeviceIdentificationNumber (byteArray) {
        var AcquiringDeviceIdentificationNumber_dataNames = ["institutionNumber", "departmentNumber", "deviceID", "deviceType", "manufacturerCode", "modelDescription",
                                                            "protocolRevisionLevel", "protocolCompatibilityLevel", "languageSupportCode", "capabilitiesCode",
                                                            "mainsFrequency", "reserved", "analysingProgramRevisionNumberLength", "analysingProgramRevisionNumber"];
        var deviceTypeDescriptors = ["Cart", "System (or Host)"];
        var manufacturerCodeDescriptors = ["Unknown", "Burdick", "Cambridge", "Compumed", "Datamed", "Fukuda", "Hewlett-Packard", "Marquette Electronics", "Mortara Instruments", "Nihon Kohden",
                                           "Okin", "Quinton", "Siemens", "Spacelabs", "Telemed", "Hellige", "ESA-OTE", "Schiller", "Picker-Schwarzer", "Elettronica-Trentina", "Zwönitz"];
        var mainsFrequencyDescriptors = ["Unspecified", "50 Hz", "60 Hz"];
                                                            
        var AcquiringDeviceIdentificationNumber = {};   // this object will be part of object patient_and_ecg_data
        
        var name_counter = 0;
        
        var byte_1x = "";
        var byte_2x = "";
        var byte_16x = "";
        
        for (var i=0; i<3; i++) {
            byte_2x = value_from_array_of_bytes(2, byteArray);
            add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], byte_2x, AcquiringDeviceIdentificationNumber);
            name_counter++;
        }
        
        for (var i=0; i<2; i++) {
            byte_1x = value_from_array_of_bytes(1, byteArray);
            if (i == 0 && byte_1x < 2) {    //deviceTypeDescriptors
                byte_1x = deviceTypeDescriptors[byte_1x];
            }
            else if (i == 1 && byte_1x < 21) {      //manufacturerCodeDescriptors
                byte_1x = manufacturerCodeDescriptors[byte_1x];
            }
            add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], byte_1x, AcquiringDeviceIdentificationNumber);
            name_counter++;
        }
        
        //modelDescription
        var str = "";
        for (var i=0; i<6; i++) {
            str += String.fromCharCode(value_from_array_of_bytes(1, byteArray));
        }
        add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], str, AcquiringDeviceIdentificationNumber);
        name_counter++;
        
        for (var i=0; i<5; i++) {
            byte_1x = value_from_array_of_bytes(1, byteArray);
            if (i == 4 && byte_1x < 3) {    //mainsFrequencyDescriptors
                byte_1x = mainsFrequencyDescriptors[byte_1x];
            }
            add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], byte_1x, AcquiringDeviceIdentificationNumber);
            name_counter++;
        }
        
        //reserved (16B)
        byte_16x = value_from_array_of_bytes(16, byteArray);
        add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], byte_16x, AcquiringDeviceIdentificationNumber);
        name_counter++;
        
        var analysingProgramRevisionNumberLength = value_from_array_of_bytes(1, byteArray);
        add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], analysingProgramRevisionNumberLength, AcquiringDeviceIdentificationNumber);
        name_counter++;
        
        var analysingProgramRevisionNumber = "";
        for (var i=0; i<parseInt(analysingProgramRevisionNumberLength); i++) {
            analysingProgramRevisionNumber += String.fromCharCode(value_from_array_of_bytes(1, byteArray)); 
        }
        add_name_and_value_to_object(AcquiringDeviceIdentificationNumber_dataNames[name_counter], analysingProgramRevisionNumber, AcquiringDeviceIdentificationNumber);
        
        return AcquiringDeviceIdentificationNumber;
    }
    
    
    
    function section_1_read_tags_content (byteArray) {
        var tag_number = value_from_array_of_bytes(1, byteArray);
        if (tag_number == 255) {
            curr_byte += 2;
            return -1;
        }
        
        var len = value_from_array_of_bytes(1, byteArray);
        
        curr_byte++;    //split 0
        
        var tag_name = section_1_tags[tag_number].name;
        var tag_type = section_1_tags[tag_number].className;
    
        var s = "";
        switch (tag_type) {
            case "Text":
                for (var i=0; i<len; i++) {
                    s += String.fromCharCode(value_from_array_of_bytes(1, byteArray));
                }
                break;
                
            case "Date":
                if (len == 4) {
                    var y = value_from_array_of_bytes(2, byteArray);
                    var m = value_from_array_of_bytes(1, byteArray);
                    var d = value_from_array_of_bytes(1, byteArray);
                    s = d + ". " + m + ". " + y;
                }
                else {
                    console.warn("Date is not 4 bytes long !");
                }
                break;
                
            case "Age":
            case "Height":
            case "Weight":
                var ageUnitsDescription = ["Unspecified", "Years", "Months", "Weeks", "Days", "Hours"];
    	        var heightUnitsDescription = ["Unspecified", "Centimeters", "Inches", "Millimeters"];
            	var weightUnitsDescription = ["Unspecified", "Kilogram", "Gram", "Pound", "Ounce"];
            	
            	var bvalue = value_from_array_of_bytes(2, byteArray);
    		    var units = value_from_array_of_bytes(1, byteArray);
    		    
    		    var unit = "";
    		    if (tag_type == "Age" && units < 6) {
    		        unit = ageUnitsDescription[units];
    		    }
    		    else if (tag_type == "Height" && units < 4) {
    		        unit = heightUnitsDescription[units];
    		    }
    		    else if (tag_type == "Weight" && units < 5) {
    		        unit = weightUnitsDescription[units];
    		    }
    		    
    		    s = bvalue + " " + unit; 
                
                break;
                
            case "Sex":
                var sexDescriptors = ["Not Known", "Male", "Female", null, null, null, null, null, null, "Unspecified"];
                var sex = value_from_array_of_bytes(1, byteArray);
                
                if (sex < 3 || sex == 9) {
                    s = sexDescriptors[sex];
                }
                else {
                    console.warn("Sex is not defined correctly !");
                }
                break;
                
            case "Race":
                var raceDescriptors = ["Unspecified", "Caucasian", "Black", "Oriental"];
                var race = value_from_array_of_bytes(1, byteArray);
                if (race < 4) {
                    s = raceDescriptors[race];
                }
                else {
                    console.warn("Race is not defined correctly !");
                }
                break;
                
            case "Drug":
                var drugClass = value_from_array_of_bytes(1, byteArray);
        		var drugCode = value_from_array_of_bytes(1, byteArray);
        		var textLength = value_from_array_of_bytes(1, byteArray);
        		
        		// saves only the last one if there are more
        		s = {
        		    drugClass: drugClass,
        		    drugCode: drugCode,
        		    textLength: textLength
        		};
        		
                break;
                
            case "Binary":
                s = parseInt(value_from_array_of_bytes(1, byteArray));
                
                break;
                
            case "MachineID":
                s = read_and_save_AcquiringDeviceIdentificationNumber (byteArray);
                break;
                
            case "StatCode":
                var statCodeDescriptors = ["Routine", "Emergency 1", "Emergency 2", "Emergency 3", "Emergency 4", "Emergency 5", "Emergency 6", "Emergency 7", "Emergency 8", "Emergency 9", "Emergency 10"];
                var stat_code = value_from_array_of_bytes(1, byteArray);
                if (stat_code < 11) {
                    s = statCodeDescriptors[stat_code];
                }
                else {
                    console.warn("StatCode is not defined correctly !");
                }
                break;
                
            case "Time":
                if (len == 3) {
                    var h = value_from_array_of_bytes(1, byteArray);
                    var m = value_from_array_of_bytes(1, byteArray);
                    var sec = value_from_array_of_bytes(1, byteArray);
                    
                    // adding the leading 0 if necessary
                    if (h.toString().length == 1) {
                        h = "0" + h;
                    }
                    if (m.toString().length == 1) {
                        m = "0" + m;
                    }
                    if (sec.toString().length == 1) {
                        sec = "0" + sec;
                    }
                    
                    s = h + ":" + m + ":" + sec;
                }
                else {
                    console.warn("Time is not 3 bytes long !");
                }
                break;
                
            case "FilterBitmap":
                var filterDescriptors = ["60 Hz Notch", "50 Hz Notch", "Artifact", "Baseline"];
                
                var filter = value_from_array_of_bytes(1, byteArray);
                
                if (filter < 4) {
                    s = filterDescriptors[filter];
                }
                else {
                    confirm.log("FilterBitmap ni pravilno definiran !");
                }
                break;
                
            case "MedicalHistory":
                var codeTable = value_from_array_of_bytes(1, byteArray);
                
                s = "codeTable: " + codeTable;
                
                break;
                
            case "Electrode":
                var electrodePlacement12LeadDescriptors = ["Unspecified", "Standard", "Mason-Likar Individual", "Mason-Likar One Pad", "All One Pad", "Derived from Frank XYZ", "Non-standard"];
                var electrodePlacementXYZLeadDescriptors = ["Unspecified", "Frank", "McFee-Parungao", "Cube", "Bipolar uncorrected", "Pseudo-orthogonal", "Derived from Standard 12-Lead"];
                
                var lead_12 = value_from_array_of_bytes(1, byteArray);
                var xyz_lead = value_from_array_of_bytes(1, byteArray);
                
                if (lead_12 < 7 && xyz_lead < 7) {
                    s = "electrodePlacement12LeadDescriptors: " + electrodePlacement12LeadDescriptors[lead_12] + ",  electrodePlacementXYZLeadDescriptors: " + electrodePlacementXYZLeadDescriptors[xyz_lead];
                }
                else {
                    confirm.log("12LeadDescriptors ali XYZLeadDescriptors ni pravilno definiran !");
                }
                break;
                
            case "TimeZone":
                // reads unsigned and saves signed
                var offset = value_from_array_of_bytes(2, byteArray);
                var signed_var = new Int8Array([offset]);
                offset = signed_var[0];
                
    		    var index = value_from_array_of_bytes(2, byteArray);   //unsigned
    		    
    		    s = "offset = " + offset + ",  index = " + index;
                
                break;
                
            default:
                console.warn("Wrong tag_type !");
        }
        
        patient_and_ecg_data = add_name_and_value_to_object(tag_name, s, patient_and_ecg_data);
        
        var bytes_read = 3 + len;
        return bytes_read;
    }
    
    
    
    function section_1_info_tags () {
        var names = ["LastName", "FirstName", "PatientIdentificationNumber", "SecondLastName", "Age", "DateOfBirth", "Height", "Weight", "Sex", "Race", "Drugs",
                    "SystolicBloodPressure", "DiastolicBloodPressure", "DiagnosisOrReferralIndication", "AcquiringDeviceIdentificationNumber", "AnalyzingDeviceIdentificationNumber",
                    "AcquiringInstitutionDescription", "AnalyzingInstitutionDescription", "AcquiringDepartmentDescription", "AnalyzingDepartmentDescription", "ReferringPhysician",
                    "LatestConfirmingPhysician", "TechnicianDescription", "RoomDescription", "StatCode", "DateOfAcquisition", "TimeOfAcquisition", "BaselineFilter", "LowPassFilter",
                    "FilterBitmap", "FreeTextField", "ECGSequenceNumber", "MedicalHistoryCodes", "ElectrodeConfigurationCode", "DateTimeZone", "FreeTextMedicalHistory"];
                    
        var tags = new Array(names.length);
        for (var i=0; i<names.length; i++) {
            tags[i] = i;
        }
        var requirements = [2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];             // 0 = optional, 1 = required, 2 = recommended
        var multiplicities = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 99, 1, 1, 99, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 99, 1, 1, 1, 1, 99];    	 // 1 = once, else more than once
    	var maximumLengths = [64, 64, 64, 64, 3, 4, 3, 3, 1, 1, 64, 2, 2, 80, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 1, 4, 3, 2, 2, 1, 80, 64, 64, 2, 64, 80];
    	var reasonableLengths = [40, 40, 40, 40, 3, 4, 3, 3, 1, 1, 40, 2, 2, 80, 40, 40, 40, 40, 40, 40, 60, 60, 40, 40, 1, 4, 3, 2, 2, 1, 80, 12, 12, 2, 40, 80];
    	var classNames = ["Text", "Text", "Text", "Text", "Age", "Date", "Height", "Weight", "Sex", "Race", "Drug", "Binary", "Binary", "Text", "MachineID", "MachineID",
    	                  "Text", "Text", "Text", "Text", "Text", "Text", "Text", "Text", "StatCode", "Date", "Time", "Binary", "Binary", "FilterBitmap", "Text", "Text",
    	                  "MedicalHistory", "Electrode", "TimeZone", "Text"];
    	
    	for (var i=0; i<names.length; i++) {
            section_1_tags.push ({
                name: names[i],
                tag: tags[i],
                requirement: requirements[i],
                multiplicity: multiplicities[i],
        		maximumLength: maximumLengths[i],
        		reasonableLength: reasonableLengths[i],
        		className: classNames[i]
            });
    	}
    }
    
    
    
    function read_and_save_section_0_info (byteArray) {
        var id = value_from_array_of_bytes(2, byteArray);
        var l = value_from_array_of_bytes(4, byteArray);
        var ind = value_from_array_of_bytes(4, byteArray);
        
        section_0_data.push ({
            ID_number: id,
            Length: l,
            Starting_Index: ind  
        });
    }
    
    
    
    function read_and_save_section_header (section_ID, byteArray) {
        sections_crc[section_ID] = value_from_array_of_bytes(2, byteArray);
        sections_ID_number[section_ID] = value_from_array_of_bytes(2, byteArray);
        sections_length[section_ID] = value_from_array_of_bytes(4, byteArray);
        sections_version_number[section_ID] = value_from_array_of_bytes(1, byteArray);
        sections_protocol_number[section_ID] = value_from_array_of_bytes(1, byteArray);
        value_from_array_of_bytes(6, byteArray);    // 6B reserved
    }
    
    
    
    function add_name_and_value_to_object (propertyName, propertyValue, obj) {
        obj[propertyName] = propertyValue;
        return obj;
    }
    
    
    
    function bin_2_dec (bin) {
        bin = bin.reverse();
        var hexString = "";
        
        for (var i=0; i<bin.length; i++) {
            if (bin[i].toString(16).length == 1) {
                hexString += "0";
            }
            hexString += bin[i].toString(16);
        }
        
        return parseInt(hexString, 16);
    }
    
    
    
    function value_from_array_of_bytes (n, byteArray) {
        var res;
        var arr = [];
        
        for (var i=0; i<n; i++) {
            arr.push(byteArray[++curr_byte]);
        }
        
        if (n > 1) {
            res = bin_2_dec(arr);
        }
        else {   // only 1 element
            res = arr[0];
        }
        
        return res;
    }
    
    
    SCP.parse_data = parse_data;
    SCP.read_data = read_data;
    
} (SCP) );
