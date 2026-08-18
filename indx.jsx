import React, { useContext, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Image, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import * as Sharing from 'expo-sharing';
import { ScrollView } from 'react-native-gesture-handler';
import { CREATE_STUDENT } from '../../db/student';
import { useMutation } from '@apollo/react-hooks';

const UploadFile = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);



  const [createStudent, { loading, error, data:students }] = useMutation(CREATE_STUDENT);


  

  const handleGoBack = () => {
    router.replace('/table');
    console.log("Redirecting to attendance page");
  };

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const [document, setDocument] = useState(null);
  const [data, setData] = useState([]); 
  const [newRow, setNewRow] = useState({
    name: '',
    email: '',
    section: '',
    grade: ''
  });
  const [fileUri, setFileUri] = useState(null); 
  const [fileName, setFileName] = useState(null); 

  const pickDocument = async () => {
    toggleModal();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'], // Only allow spreadsheets
      });

      if (!result.canceled) {
        setFileName(result.assets[0].name);
        setFileUri(result.assets[0].uri); 
        readExcelFile(result.assets[0].uri);
        setDocument(result);
        console.log(result);
      } else {
        console.log('Document picker was cancelled');
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const UploadStudentData = async (row) => {
    try {
      const createStudentDto = {
        name: row[1], 
        college: row[2],
        department: row[3],
        section: row[4].toString(),
        qrCode: "gbnf", 
      };
  
      const response = await createStudent({
        variables: {
          input: createStudentDto, 
        },
      });
      console.log("dfkdhkjsghfjdsh*****************",students);
      console.log(response);
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };
  
  const readExcelFile = async (uri) => {
    try {
      const file = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = Buffer.from(file, 'base64').toString('binary');
      const workbook = XLSX.read(binary, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      // Validate the header
      const requiredColumns = ['id', 'name', 'college', 'department', 'section', 'qrcode'];
      const header = jsonData[0].map((column) => column.toLowerCase());
      
      if (!requiredColumns.every((column) => header.includes(column.toLowerCase()))) {
        alert('The Excel file does not follow the required format. Please make sure the header has the columns: id, name, college, department, section, and qrcode.');
        return;
      }
  
      if (header.length !== new Set(header).size) {
        alert('The Excel file has repeated columns in the header. Please make sure the header columns are unique.');
        return;
      }
  
      const cleanedData = jsonData
        .slice(1) // Remove the header row
        .map((row) => row.filter((cell) => cell !== null && cell !== undefined && cell !== ''))
        .filter((row) => row.length > 0);
  
      if (cleanedData.length === 0) {
        alert('No data to insert. Please make sure the Excel file has data rows.');
        return;
      }
      setData([...data, cleanedData])
      const uploadPromises = cleanedData.map(async (row) => {
        await UploadStudentData(row);
      });
  
      await Promise.all(uploadPromises); 
  
      alert('Student data successfully uploaded');
    } catch (error) {
      console.error('Error reading Excel file:', error);
    }
  };
  
  

  // Add a new row to the data
  const addNewRow = () => {
    const newRowData = [
      newRow.name,
      newRow.email,
      newRow.section,
      newRow.grade,
    ];
    const updatedData = [...data, newRowData];
    setData(updatedData); // Add the new row to the current data
  };

  // Save the updated Excel file back to internal storage (permanent location)
  const saveExcelFile = async () => {
    try {
      if (!fileUri) {
        alert('No file to save!');
        return;
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data); // Convert the array of arrays to a worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
      const base64Excel = Buffer.from(excelBinary, 'binary').toString('base64');

      // Get the document directory for saving the file
      const documentDirectory = FileSystem.documentDirectory;
      const newFileUri = documentDirectory + fileName; 
      console.log("File path****************:", newFileUri);
      // Save the file to internal storage (permanent location)
      await FileSystem.writeAsStringAsync(newFileUri, base64Excel, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setFileUri(newFileUri);

      console.log('Excel file saved at:', newFileUri);
      alert('Excel file saved successfully!');
    } catch (error) {
      console.error('Error saving Excel file:', error);
    }
  };

  // Share the saved Excel file using Expo Sharing API
  const shareFile = async () => {
    try {
      if (!fileUri) {
        alert('No file to share!');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      alert('Failed to share the file.');
    }
  };

  return (
    <ScrollView>
      <SafeAreaView className="flex justify-between items-center h-full bg-white">
        <View className="justify-center items-center w-[80%] opacity-100 border-2 border-blue-500 py-12 bg-gray-100 rounded-lg ">
          <TouchableOpacity onPress={toggleModal}>
            <Image
              source={require('../../assets/uploadfile.webp')}
              style={{ width: 150, height: 150, marginBottom: 20 }}
              className="pb-6"
              resizeMode="contain"
            />
            <Text className="text-center text-2xl overflow-clip">Upload File</Text>
          </TouchableOpacity>
        </View>

        {/* Display Selected Document Info */}
        {document && (
          <View className="justify-center items-center w-[80%] opacity-100 border-2 border-blue-500 py-12 bg-red-700 rounded-lg ">
            <Text className="text-center text-2xl overflow-clip">File Selected</Text>
            <Text className="text-center text-2xl overflow-clip">{document.name}</Text>
            <Text className="text-center text-2xl overflow-clip">{document.size} bytes</Text>
          </View>
        )}

        {/* Display Current Excel Data */}
        {data.length > 0 && (
          <View className="mt-4">
            <Text className="text-xl">Current Data:</Text>
            {data.map((row, index) => (
              <Text key={index} className="text-lg">
                {row.join(', ')}
              </Text>
            ))}
          </View>
        )}

        {/* Bottom sheet modal */}
        <Modal isVisible={isModalVisible} onBackdropPress={toggleModal}>
          <View className="justify-center items-center p-4 bg-gray-100 rounded-lg">
            <Text className="text-2xl font-bold mb-4">File Upload Requirements</Text>
            <Text className="text-base mb-1">The file must be an Excel (.xl) file.</Text>
            <Text className="text-base mb-1">The following columns are mandatory:</Text>
            <Text className="text-base mb-1">- Name</Text>
            <Text className="text-base mb-1">- ID</Text>
            <Text className="text-base mb-1">- QR Code</Text>
            <Text className="text-base mb-1">- College</Text>
            <Text className="text-base mb-1">- Section</Text>

            <TouchableOpacity onPress={pickDocument} className="bg-blue-600 py-4 px-6 rounded-lg mt-8">
              <Text className="text-white">Okay</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Add New Row */}
        <View className="p-4 w-[80%]">
          <TextInput
            placeholder="Name"
            value={newRow.name}
            onChangeText={(text) => setNewRow({ ...newRow, name: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            value={newRow.email}
            onChangeText={(text) => setNewRow({ ...newRow, email: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Section"
            value={newRow.section}
            onChangeText={(text) => setNewRow({ ...newRow, section: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Grade"
            value={newRow.grade}
            onChangeText={(text) => setNewRow({ ...newRow, grade: text })}
            style={styles.input}
          />
          <TouchableOpacity onPress={addNewRow} className="bg-green-500 py-2 px-4 rounded-lg mt-4">
            <Text className="text-white">Add Row</Text>
          </TouchableOpacity>
        </View>

        {/* Save and Share Buttons */}
        <View className="mt-6">
          <TouchableOpacity onPress={saveExcelFile} className="bg-red-600 py-2 px-6 rounded-lg mb-4">
            <Text className="text-white">Save Excel File</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareFile} className="bg-blue-600 py-2 px-6 rounded-lg">
            <Text className="text-white">Share Excel File</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation buttons */}
        <View className="flex-1 flex-row justify-center items-center mt-6 space-x-4 overflow-scroll px-8">
          <TouchableOpacity onPress={handleGoBack} className="border-red-700 border-2 h-[15%] px-4 justify-center items-center rounded-lg w-[50%]">
            <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 24 }}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveExcelFile} className="border-red-700 border-2 h-[15%] px-4 justify-center rounded-lg w-[50%] items-center">
            <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 24 }}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    width: '100%',
  },
});

export default UploadFile;
