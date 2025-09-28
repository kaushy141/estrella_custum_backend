const { User } = require("../models/user-model");
const { Project } = require("../models/project-model");
const { Group } = require("../models/group-model");
const { CustomAgent } = require("../models/custom-agent-model");
const { ShippingService } = require("../models/shipping-service-model");
const { GroupAddress } = require("../models/group-address-model");
const { sendResponseWithData } = require("../helper/commonResponseHandler");
const { SuccessCode, ErrorCode } = require("../helper/statusCode");

/**
 * Get statistics for all entities
 * For regular users: returns counts filtered by their groupId
 * For super admins: returns counts for all entities across all groups
 */
const getAllStats = async (req, res) => {
    try {
        const { isSuperAdmin, groupId } = req.user;

        // Define where clause based on user role
        const whereClause = isSuperAdmin ? {} : { groupId };

        // Get counts for all entities
        const [
            userCount,
            projectCount,
            groupCount,
            customAgentCount,
            shippingServiceCount,
            addressCount
        ] = await Promise.all([
            // Users count
            User.count({
                where: whereClause
            }),

            // Projects count
            Project.count({
                where: whereClause
            }),

            // Groups count (only for super admin)
            isSuperAdmin ? Group.count() : 0,

            // Custom Agents count
            CustomAgent.count({
                where: whereClause
            }),

            // Shipping Services count
            ShippingService.count({
                where: whereClause
            }),

            // Group Addresses count
            GroupAddress.count({
                where: whereClause
            })
        ]);

        const stats = {
            users: userCount,
            projects: projectCount,
            groups: groupCount,
            customAgents: customAgentCount,
            shippingServices: shippingServiceCount,
            addresses: addressCount,
            userRole: isSuperAdmin ? 'super_admin' : 'user',
            groupId: isSuperAdmin ? null : groupId
        };

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Statistics retrieved successfully",
            stats
        );

    } catch (error) {
        console.error("Error getting statistics:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to retrieve statistics",
            error
        );
    }
};

/**
 * Get detailed statistics with additional breakdowns
 * For regular users: returns counts filtered by their groupId with status breakdowns
 * For super admins: returns counts for all entities across all groups with detailed breakdowns
 */
const getDetailedStats = async (req, res) => {
    try {
        const { isSuperAdmin, groupId } = req.user;

        // Define where clause based on user role
        const whereClause = isSuperAdmin ? {} : { groupId };

        // Get detailed counts for all entities
        const [
            userStats,
            projectStats,
            groupStats,
            customAgentStats,
            shippingServiceStats,
            addressStats
        ] = await Promise.all([
            // Users statistics
            Promise.all([
                User.count({ where: { ...whereClause, isActive: true } }),
                User.count({ where: { ...whereClause, isActive: false } }),
                User.count({ where: { ...whereClause, isAdmin: true } })
            ]),

            // Projects statistics
            Promise.all([
                Project.count({ where: { ...whereClause, isActive: true } }),
                Project.count({ where: { ...whereClause, isActive: false } })
            ]),

            // Groups statistics (only for super admin)
            isSuperAdmin ? Promise.all([
                Group.count({ where: { isActive: true } }),
                Group.count({ where: { isActive: false } })
            ]) : [0, 0],

            // Custom Agents statistics
            Promise.all([
                CustomAgent.count({ where: { ...whereClause, isActive: true } }),
                CustomAgent.count({ where: { ...whereClause, isActive: false } })
            ]),

            // Shipping Services statistics
            Promise.all([
                ShippingService.count({ where: { ...whereClause, isActive: true } }),
                ShippingService.count({ where: { ...whereClause, isActive: false } })
            ]),

            // Group Addresses statistics
            Promise.all([
                GroupAddress.count({ where: { ...whereClause, isActive: true } }),
                GroupAddress.count({ where: { ...whereClause, isActive: false } })
            ])
        ]);

        const detailedStats = {
            users: {
                total: userStats[0] + userStats[1],
                active: userStats[0],
                inactive: userStats[1],
                admins: userStats[2]
            },
            projects: {
                total: projectStats[0] + projectStats[1],
                active: projectStats[0],
                inactive: projectStats[1]
            },
            groups: {
                total: groupStats[0] + groupStats[1],
                active: groupStats[0],
                inactive: groupStats[1]
            },
            customAgents: {
                total: customAgentStats[0] + customAgentStats[1],
                active: customAgentStats[0],
                inactive: customAgentStats[1]
            },
            shippingServices: {
                total: shippingServiceStats[0] + shippingServiceStats[1],
                active: shippingServiceStats[0],
                inactive: shippingServiceStats[1]
            },
            addresses: {
                total: addressStats[0] + addressStats[1],
                active: addressStats[0],
                inactive: addressStats[1]
            },
            userRole: isSuperAdmin ? 'super_admin' : 'user',
            groupId: isSuperAdmin ? null : groupId
        };

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            "Detailed statistics retrieved successfully",
            detailedStats
        );

    } catch (error) {
        console.error("Error getting detailed statistics:", error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            "Failed to retrieve detailed statistics",
            error
        );
    }
};

/**
 * Get statistics for a specific entity
 * @param {string} entity - The entity to get statistics for (users, projects, groups, customAgents, shippingServices, addresses)
 */
const getEntityStats = async (req, res) => {
    try {
        const { entity } = req.params;
        const { isSuperAdmin, groupId } = req.user;

        // Define where clause based on user role
        const whereClause = isSuperAdmin ? {} : { groupId };

        let stats = {};

        switch (entity) {
            case 'users':
                const [activeUsers, inactiveUsers, adminUsers] = await Promise.all([
                    User.count({ where: { ...whereClause, isActive: true } }),
                    User.count({ where: { ...whereClause, isActive: false } }),
                    User.count({ where: { ...whereClause, isAdmin: true } })
                ]);
                stats = {
                    total: activeUsers + inactiveUsers,
                    active: activeUsers,
                    inactive: inactiveUsers,
                    admins: adminUsers
                };
                break;

            case 'projects':
                const [activeProjects, inactiveProjects] = await Promise.all([
                    Project.count({ where: { ...whereClause, isActive: true } }),
                    Project.count({ where: { ...whereClause, isActive: false } })
                ]);
                stats = {
                    total: activeProjects + inactiveProjects,
                    active: activeProjects,
                    inactive: inactiveProjects
                };
                break;

            case 'groups':
                if (!isSuperAdmin) {
                    return sendResponseWithData(
                        res,
                        ErrorCode.FORBIDDEN,
                        "Access denied - group statistics only available to super admins",
                        null
                    );
                }
                const [activeGroups, inactiveGroups] = await Promise.all([
                    Group.count({ where: { isActive: true } }),
                    Group.count({ where: { isActive: false } })
                ]);
                stats = {
                    total: activeGroups + inactiveGroups,
                    active: activeGroups,
                    inactive: inactiveGroups
                };
                break;

            case 'customAgents':
                const [activeAgents, inactiveAgents] = await Promise.all([
                    CustomAgent.count({ where: { ...whereClause, isActive: true } }),
                    CustomAgent.count({ where: { ...whereClause, isActive: false } })
                ]);
                stats = {
                    total: activeAgents + inactiveAgents,
                    active: activeAgents,
                    inactive: inactiveAgents
                };
                break;

            case 'shippingServices':
                const [activeShippingServices, inactiveShippingServices] = await Promise.all([
                    ShippingService.count({ where: { ...whereClause, isActive: true } }),
                    ShippingService.count({ where: { ...whereClause, isActive: false } })
                ]);
                stats = {
                    total: activeShippingServices + inactiveShippingServices,
                    active: activeShippingServices,
                    inactive: inactiveShippingServices
                };
                break;

            case 'addresses':
                const [activeAddresses, inactiveAddresses] = await Promise.all([
                    GroupAddress.count({ where: { ...whereClause, isActive: true } }),
                    GroupAddress.count({ where: { ...whereClause, isActive: false } })
                ]);
                stats = {
                    total: activeAddresses + inactiveAddresses,
                    active: activeAddresses,
                    inactive: inactiveAddresses
                };
                break;

            default:
                return sendResponseWithData(
                    res,
                    ErrorCode.BAD_REQUEST,
                    "Invalid entity type. Valid entities: users, projects, groups, customAgents, shippingServices, addresses",
                    null
                );
        }

        const response = {
            entity,
            stats,
            userRole: isSuperAdmin ? 'super_admin' : 'user',
            groupId: isSuperAdmin ? null : groupId
        };

        return sendResponseWithData(
            res,
            SuccessCode.OK,
            `${entity} statistics retrieved successfully`,
            response
        );

    } catch (error) {
        console.error(`Error getting ${req.params.entity} statistics:`, error);
        return sendResponseWithData(
            res,
            ErrorCode.REQUEST_FAILED,
            `Failed to retrieve ${req.params.entity} statistics`,
            error
        );
    }
};

module.exports = {
    getAllStats,
    getDetailedStats,
    getEntityStats
};
