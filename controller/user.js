const { User } = require("../models/user-model");
const { Group } = require("../models/group-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");
const activityHelper = require("../helper/activityHelper");
const crypto = require("crypto");
const { Op } = require("sequelize");
const _ = require("lodash");

const controller = {
  // Create new user
  create: async function (req, res) {
    try {
      const data = req.body;

      // Verify group exists
      const group = await Group.findByPk(data.groupId);
      if (!group) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "Group not found",
          null
        );
      }

      // Hash password if provided
      if (data.password) {
        data.password = crypto
          .createHash("sha256")
          .update(data.password)
          .digest("hex");
      }

      const user = await User.create(data);

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      // Log activity
      try {
        await activityHelper.logUserCreation(
          userResponse,
          req.userId || data.createdBy || 1
        );
      } catch (activityError) {
        console.error("Activity logging failed:", activityError);
        // Don't fail the main operation if activity logging fails
      }

      let responseData = {
        status: "success",
        data: userResponse,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "User created successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to create user",
        err
      );
    }
  },

  // Get all users
  getAll: async function (req, res) {
    try {
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;

      const groupId = req.groupId;
      const isSuperAdmin = req.isSuperAdmin;
      let whereClause = {};
      whereClause.groupId = groupId;
      if (isSuperAdmin) {
        _.omit(whereClause, "groupId");
      }
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }
        console.error("whereClause users",whereClause);

      const users = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo"],
          },
        ],
        attributes: { exclude: ["password"] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      let responseData = {
        status: "success",
        data: users.rows,
        count: users.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Users loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load users",
        err
      );
    }
  },

  // Get user by ID or GUID
  getById: async function (req, res) {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo", "description"],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "User not found",
          null
        );
      }

      let responseData = {
        status: "success",
        data: user,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "User loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load user",
        err
      );
    }
  },

  // Update user
  update: async function (req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const user = await User.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
      });

      if (!user) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "User not found",
          null
        );
      }

      // Verify group exists if groupId is being updated
      if (data.groupId) {
        const group = await Group.findByPk(data.groupId);
        if (!group) {
          return sendResponseWithData(
            res,
            ErrorCode.NOT_FOUND,
            "Group not found",
            null
          );
        }
      }

      // Hash password if provided
      if (data.password) {
        data.password = crypto
          .createHash("sha256")
          .update(data.password)
          .digest("hex");
      }

      await user.update(data);
      const updatedUser = await user.save();

      // Remove password from response
      const userResponse = updatedUser.toJSON();
      delete userResponse.password;

      let responseData = {
        status: "success",
        data: userResponse,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "User updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update user",
        err
      );
    }
  },

  // Delete user
  delete: async function (req, res) {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: {
          $or: [{ id: id }, { guid: id }],
        },
      });

      if (!user) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "User not found",
          null
        );
      }

      await user.destroy();

      let responseData = {
        status: "success",
        message: "User deleted successfully",
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "User deleted successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to delete user",
        err
      );
    }
  },

  // Get users by group
  getByGroup: async function (req, res) {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 10, isActive } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = { groupId };
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ["password"] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      let responseData = {
        status: "success",
        data: users.rows,
        count: users.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Users loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load users",
        err
      );
    }
  },

  // Search users by email or name
  search: async function (req, res) {
    try {
      const { search, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = {};
      if (search) {
        whereClause = {
          $or: [
            { email: { [Op.iLike]: `%${search}%` } },
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
          ],
        };
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo"],
          },
        ],
        attributes: { exclude: ["password"] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      let responseData = {
        status: "success",
        data: users.rows,
        count: users.count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.count / limit),
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Users loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load users",
        err
      );
    }
  },

  // Get user profile (current authenticated user)
  getProfile: async function (req, res) {
    try {
      const userId = req.userId; // This should be set by auth middleware

      if (!userId) {
        return sendResponseWithData(
          res,
          ErrorCode.UNAUTHORIZED,
          "User not authenticated",
          null
        );
      }

      const user = await User.findByPk(userId, {
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["id", "name", "logo", "description"],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "User not found",
          null
        );
      }

      let responseData = {
        status: "success",
        data: user,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "User profile loaded successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to load user profile",
        err
      );
    }
  },

  // Update user profile (current authenticated user)
  updateProfile: async function (req, res) {
    try {
      const userId = req.userId; // This should be set by auth middleware
      const data = req.body;

      if (!userId) {
        return sendResponseWithData(
          res,
          ErrorCode.UNAUTHORIZED,
          "User not authenticated",
          null
        );
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "User not found",
          null
        );
      }

      // Only allow updating certain fields for profile
      const allowedFields = ["firstName", "lastName", "email"];
      const updateData = {};

      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      });

      // Verify group exists if groupId is being updated
      if (data.groupId) {
        const group = await Group.findByPk(data.groupId);
        if (!group) {
          return sendResponseWithData(
            res,
            ErrorCode.NOT_FOUND,
            "Group not found",
            null
          );
        }
        updateData.groupId = data.groupId;
      }

      await user.update(updateData);
      const updatedUser = await user.save();

      // Remove password from response
      const userResponse = updatedUser.toJSON();
      delete userResponse.password;

      let responseData = {
        status: "success",
        data: userResponse,
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "User profile updated successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to update user profile",
        err
      );
    }
  },

  // Change password (current authenticated user)
  changePassword: async function (req, res) {
    try {
      const userId = req.userId; // This should be set by auth middleware
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return sendResponseWithData(
          res,
          ErrorCode.UNAUTHORIZED,
          "User not authenticated",
          null
        );
      }

      if (!currentPassword || !newPassword) {
        return sendResponseWithData(
          res,
          ErrorCode.BAD_REQUEST,
          "Current password and new password are required",
          null
        );
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return sendResponseWithData(
          res,
          ErrorCode.NOT_FOUND,
          "User not found",
          null
        );
      }

      // Verify current password
      const currentPasswordHash = crypto
        .createHash("sha256")
        .update(currentPassword)
        .digest("hex");
      if (user.password !== currentPasswordHash) {
        return sendResponseWithData(
          res,
          ErrorCode.BAD_REQUEST,
          "Current password is incorrect",
          null
        );
      }

      // Hash new password
      const newPasswordHash = crypto
        .createHash("sha256")
        .update(newPassword)
        .digest("hex");

      // Update password
      await user.update({ password: newPasswordHash });
      await user.save();

      let responseData = {
        status: "success",
        message: "Password changed successfully",
      };

      return sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        "Password changed successfully",
        responseData
      );
    } catch (err) {
      return sendResponseWithData(
        res,
        ErrorCode.REQUEST_FAILED,
        "Unable to change password",
        err
      );
    }
  },
};

module.exports = controller;
