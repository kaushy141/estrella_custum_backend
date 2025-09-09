const fs = require("fs");
const path = require("path");
let aiTranslateServiceUrl =
  process.env.AI_TRANSLATE_SERVICE_URL ||
  "http://localhost:8080/api/v1/translate";

const translateDocument = async ({ taskId, filePath, fileName, language }) => {
  try {
    // Read the original file content
    // Use absolute path
    const absoluteOriginalFilePath = path.resolve(filePath);

    if (!fs.existsSync(absoluteOriginalFilePath)) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Original file not found",
        null
      );
    }

    const fileStream = fs.createReadStream(absoluteImagePath);

    const form = new FormData();
    form.append("file", fileStream, {
      filename: req?.files["file"][0]?.name,
    });
    form.append("taskId", taskId);
    form.append("language", language);

    const response = await axios.post(aiTranslateServiceUrl, form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000, // 30 second timeout
    });

    // // Generate translated file name
    const fileExtension = path.extname(fileName);
    const fileNameWithoutExt = path.basename(fileName, fileExtension);
    const translatedFileName = `${fileNameWithoutExt}_${language}${fileExtension}`;

    // // Generate translated file path
    const uploadsDir = path.dirname(filePath);
    const translatedFilePath = path.join(uploadsDir, translatedFileName);

    // // TODO: Implement actual translation logic here
    // // For now, we'll simulate translation by adding a prefix
    const translatedContent = response.data.translatedContent;
    // Write the translated content to the new file
    fs.writeFileSync(translatedFilePath, translatedContent, "utf8");

    return {
      translatedFilePath,
      translatedFileName,
    };
  } catch (error) {
    console.error("Translation service error:", error);
    throw new Error(`Failed to translate invoice: ${error.message}`);
  }
};

module.exports = {
  translateDocument,
};
