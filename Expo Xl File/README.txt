# EXPO-File--Management


## **General Conclusion for File Handling in React Native with Expo**

This documentation covers essential steps for working with files in Expo and React Native, specifically for:

1. **Uploading and reading Excel files using `expo-document-picker`**.
2. **Saving files to internal storage using `expo-file-system`**.
3. **Sharing files externally using `expo-sharing`**.
4. **Exporting and saving data to Excel format using `xlsx`**.

By following this guide, you'll learn how to upload, modify, save, and share Excel files in your Expo app. Below, you'll also find the necessary setup, package installations, and code examples.

---

### **1. Packages You Need to Install**

Before you begin, you'll need to install the following dependencies in your Expo project:

1. **expo-document-picker**: To allow users to pick files from their device.
2. **expo-file-system**: For reading and writing files to internal storage.
3. **expo-sharing**: To share files between apps installed on the device.
4. **xlsx**: To parse and create Excel files.
5. **buffer** (optional but needed for encoding base64 properly): Provides the `Buffer` object for converting file data.

To install these packages, run the following commands in your project:

```bash
expo install expo-document-picker
expo install expo-file-system
expo install expo-sharing
npm install xlsx
npm install buffer
```

---

### **2. Uploading and Reading Files Using `expo-document-picker`**

The `expo-document-picker` module allows users to select documents from their device. We use this to read and parse Excel or CSV files.

#### **Code for Picking an Excel File**

```javascript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';

const FileUpload = () => {
  const [fileData, setFileData] = useState(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (result.type === 'success') {
        const fileUri = result.uri;
        readExcelFile(fileUri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const readExcelFile = async (uri) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = Buffer.from(fileContent, 'base64').toString('binary');
      const workbook = XLSX.read(binary, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setFileData(jsonData);
    } catch (error) {
      console.error('Error reading Excel file:', error);
    }
  };

  return (
    <View>
      <Button title="Pick Excel File" onPress={pickDocument} />
      {fileData && <Text>{JSON.stringify(fileData)}</Text>}
    </View>
  );
};

export default FileUpload;
```

#### **Explanation:**

- **Document Picker**: `expo-document-picker` opens the file picker dialog to select an Excel file.
- **Reading Excel**: After the file is picked, it is read as a base64 string and converted to binary. Then, using the `xlsx` library, we parse the file and extract its contents as JSON data.
- **Displaying Data**: After the file is read and parsed, it displays the rows and columns in JSON format.

---

### **3. Saving Files to Internal Storage**

Expo’s `expo-file-system` API allows you to save files to your app’s internal storage. This is useful for saving modified Excel files or any other data you want to store locally.

#### **Code for Saving Excel Files**

```javascript
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

const saveExcelFile = async (data, fileName) => {
  try {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    const base64Excel = Buffer.from(excelBinary, 'binary').toString('base64');

    const documentDirectory = FileSystem.documentDirectory;
    const newFileUri = documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(newFileUri, base64Excel, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('File saved at:', newFileUri);
  } catch (error) {
    console.error('Error saving file:', error);
  }
};
```

#### **Explanation:**

- **Saving Excel**: This function converts the provided data into an Excel worksheet and then into binary format. It is then encoded as base64.
- **Saving to Internal Storage**: The `expo-file-system` API saves the base64-encoded Excel data to your app's internal storage. The saved file can later be accessed via the `documentDirectory`.

---

### **4. Sharing Files Using Expo Sharing API**

With `expo-sharing`, you can share files to other apps installed on the device, such as email apps, cloud storage apps, or social media apps.

#### **Code for Sharing Files**

```javascript
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const shareFile = async (fileUri) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri);
    } else {
      console.error('Sharing is not available on this device.');
    }
  } catch (error) {
    console.error('Error sharing file:', error);
  }
};
```

#### **Explanation:**

- **Sharing API**: `expo-sharing` provides the `shareAsync()` function to trigger the file-sharing dialog, allowing the user to send the file to another app.
- **Checking Availability**: Before triggering the sharing dialog, `Sharing.isAvailableAsync()` checks whether sharing is available on the current device.

---

### **5. Saving Files to the Downloads Folder (External Storage)**

Expo does not directly support saving files to external storage or the Downloads folder without ejecting. However, sharing files with other apps is a viable alternative, where you can use apps like Google Drive or email to save files to the Downloads folder.

#### **Possible Workaround for Sharing to the Downloads Folder**

You can trigger the sharing dialog (via `expo-sharing`) and manually choose an app that will save the file to the Downloads folder.

```javascript
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const shareFileToDownloads = async (fileUri) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri);
    } else {
      console.error('Sharing is not available on this device.');
    }
  } catch (error) {
    console.error('Error sharing file:', error);
  }
};
```

#### **Explanation:**

- **Sharing**: The file is shared to external apps installed on the device, where the user can save it to the Downloads folder or another external location.

---

### **Key Takeaways:**

1. **expo-document-picker**: Allows picking files (Excel, CSV) from the device.
2. **expo-file-system**: Use it to read, write, and save files to internal storage.
3. **xlsx**: Helps in parsing and creating Excel files programmatically.
4. **expo-sharing**: Facilitates sharing files with other apps installed on the device.
5. **External Storage**: Direct access to the Downloads folder is not supported in managed Expo projects; however, sharing files with other apps can be an effective workaround.

---

### **Further Reading:**

- [expo-document-picker Documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [expo-file-system Documentation](https://docs.expo.dev/versions/latest/sdk/file-system/)
- [expo-sharing Documentation](https://docs.expo.dev/versions/latest/sdk/sharing/)
- [xlsx Documentation](https://github.com/SheetJS/sheetjs)

This documentation can serve as a reference for working with file uploads, saving data, and sharing files in your React Native app using Expo.

---
