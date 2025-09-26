const _ = require("lodash");
const moment = require("moment");
const { Op } = require("sequelize");
const c = require("../config/constants");
const { Project } = require("../models/project-model");

const AIHelper = {
  createProjectAIThread: async function(projectId) {
    try {
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      //Create AI Thred
      const form = new FormData();
      form.append('chat_name', project.title);
        const aiResponse = await axios.post('http://localhost:8000/ai/createChat', form, {
          headers: {
            ...form.getHeaders(),
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
        });

      console.log("aiResponse", aiResponse);

    } catch (error) {
      console.error("Error creating project AI thread:", error);
      throw error;
    }
  },

};
module.exports = AIHelper;


