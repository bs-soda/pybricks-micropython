> **Template (WP06)** — Generated from completed project reference. Replace all `{{placeholders}}` and remove example rows before baseline. Do not copy Sodality-specific URLs or credentials into new projects.

***[Insert diagram or screenshot here]***

**{{project_name}}**

**Maintenance Documentation**

**Document Version: 1.0**
**Author:** {{role_name}}
**Approval Date:** 01 September 2025

**Revision History**

| Version | Date | Description | Author | Status |
| :---: | :---: | ----- | ----- | :---: |
| 0.1 | {{date}} | Initial draft created. Populated with System Overview, initial Monitoring procedures, and Backup strategy based on the implemented infrastructure. | [{{role_name}}]({{contact_email}}) | Draft |
| 0.2 | {{date}} | Major update. Added detailed Deployment & Hotfix procedures. Populated the Common Troubleshooting Guide with initial known issues. Added Key Contacts list. | [{{role_name}}]({{contact_email}}) | For Review |
| 0.3 | {{date}} | Incorporated final feedback from the team. Verified all links to dashboards and admin panels are correct. Prepared document for formal handover. | [{{role_name}}]({{contact_email}}) | For Approval |
| 1.0 | {{date}} | **Baseline Version.** | [{{author}}]({{contact_email}}) | Approved |

###

###

###

**Table of Contents**

[**1\. Introduction and Purpose	1**](#1.-introduction-and-purpose)

[**2\. System Overview	1**](#2.-system-overview)

[**3\. Key Contacts for Maintenance & Support	2**](#3.-key-contacts-for-maintenance-&-support)

[**4\. Core Maintenance Procedures	2**](#4.-core-maintenance-procedures)

[4.1 System Monitoring	2](#4.1-system-monitoring)

[4.2 Backup and Recovery	3](#4.2-backup-and-recovery)

[4.3 Deployment & Hotfix Procedure	3](#4.3-deployment-&-hotfix-procedure)

[4.4 Content Management (Strapi)	4](#4.4-content-management-\(strapi\))

[**5\. Common Troubleshooting Guide	4**](#5.-common-troubleshooting-guide)

[**6\. Access Credentials & Security	5**](#6.-access-credentials-&-security)

[**7\. Backup Procedures	5**](#7.-backup-procedures)

[**8\. Service Level Agreement (SLA)	6**](#8.-service-level-agreement-\(sla\))

[8.1 Agreement Overview	6](#8.1-agreement-overview)

[8.2 Scope of Services	7](#8.2-scope-of-services)

[8.3 Roles and Responsibilities	8](#8.3-roles-and-responsibilities)

[8.4 Service Performance and Metrics	8](#8.4-service-performance-and-metrics)

####

### **1\. Introduction and Purpose** {#1.-introduction-and-purpose}

This document provides a comprehensive guide for the ongoing maintenance, support, and operation of the "{{project_name}}" application and its associated backend infrastructure. The purpose of this documentation is to ensure that the maintenance team has all the necessary information to keep the system running smoothly, troubleshoot issues, and deploy updates effectively.

This is a living document and should be updated regularly to reflect any changes in the system architecture, procedures, or contact information.

### **2\. System Overview** {#2.-system-overview}

The "{{project_name}}" ecosystem consists of the following key components:

* **Mobile Application (Frontend):** A cross-platform application built with **Flutter** for iOS and Android.
* **Core API (Backend):** A **NestJS** application responsible for business logic, user management, and astrological calculations.
* **Content Management System (CMS):** A **Strapi** application used to manage dynamic content such as guided meditations and legal text.
* **Databases:**
  * **MongoDB:** The primary NoSQL database for storing user-generated content and astrological data.
  * **PostgreSQL:** The relational database for user accounts and structured data.
* **Cloud Infrastructure:** All backend services and databases are hosted on **Digital Ocean and Firebase**.

###

### **3\. Key Contacts for Maintenance & Support** {#3.-key-contacts-for-maintenance-&-support}

| Role / Area of Responsibility | Contact Information |
| ----- | ----- |
| **Primary Maintenance Lead** | Nutthapol Prompukdee {{email}} \{{phone}} |
| **Backend Support (NestJS/Strapi)** | {{role_name}} {{email}} \{{phone}} |
| **Mobile App Support (Flutter)** | {{role_name}} {{email}}\{{phone}} |
| **Cloud Infrastructure / DevOps** | {{role_name}} {{email}} \{{phone}} |

####

### **4\. Core Maintenance Procedures** {#4.-core-maintenance-procedures}

#### **4.1 System Monitoring** {#4.1-system-monitoring}

* **Application Performance & Error Monitoring:**
  * **Description:** All mobile app crashes and performance issues are tracked using **Firebase Crashlytics**. All backend API errors are tracked using **Monitor Bot via discord**
  * **Procedure:** The monitoring dashboard should be checked daily for new critical issues. Email alerts for high-severity errors are configured to be sent to the Primary Maintenance Lead.
* **Infrastructure Health Monitoring:**
  * **Description:** Server CPU utilization, memory, database connections, and API latency are monitored via the cloud provider's native tools.
  * **Procedure:** Health alerts (e.g., high CPU usage) are configured to notify the Cloud Infrastructure contact. **Monitor or track via DigitalOcean.**

#### **4.2 Backup and Recovery** {#4.2-backup-and-recovery}

* **Databases (PostgreSQL & MongoDB):**
  * **Backup Strategy:** Automated daily snapshots of both databases are managed by the cloud provider's managed database service (DigitalOcean). Backups are retained for \[e.g., 30 days\].
  * **Recovery Procedure:** In case of data loss, a point-in-time recovery can be initiated from the cloud provider's database console (DigitalOcean). Refer to the Digital Ocean official documentation for detailed steps.
  * **Testing:** The recovery process must be tested on a non-production environment at least once every \[e.g., 6 months\] to ensure its validity.

#### **4.3 Deployment & Hotfix Procedure** {#4.3-deployment-&-hotfix-procedure}

* **Standard Deployment (New Features / Updates):**
  1. Code is merged into the develop branch and deployed to the **Staging Environment**.
  2. QA team performs regression testing on Staging.
  3. Upon QA approval, the develop branch is merged into the main branch.
  4. The CI/CD pipeline automatically deploys the main branch to the **Production Environment**.
  5. For mobile, the new build is first released to **TestFlight / Google Play Internal Testing** for final verification before a phased rollout to the public.
* **Emergency Hotfix (Critical Bugs):**
  1. A hotfix branch is created from the main branch.
  2. The critical bug is fixed and committed.
  3. The hotfix is deployed directly to **Production** after a focused peer review and minimal testing.
  4. The hotfix branch is immediately merged back into main and develop.

#### **4.4 Content Management (Strapi)** {#4.4-content-management-(strapi)}

* **Admin Panel URL:** \[To be filled\]
* **Procedure:** New content (e.g., Guided Meditations) is first created in a "Draft" state. After review, it must be explicitly "Published" to become visible in the live application.

### **5\. Common Troubleshooting Guide** {#5.-common-troubleshooting-guide}

| Issue | Potential Cause | First Steps to Diagnose / Resolve |
| ----- | ----- | ----- |
| **API is unresponsive (5xx errors)** | • The backend service container is down. • Database connection issue. | 1\. Check the container/service status on the cloud provider's console. 2\. Review the API logs for error messages (e.g., database connection errors). 3\. Restart the service container. |
| **Mobile app is crashing for many users** | • A recent code change in the new version. • An unexpected API response. | 1\. Immediately check the crash monitoring dashboard (Sentry/Crashlytics) for the root cause. 2\. If it's a critical bug, halt the phased rollout on the App/Play Store. 3\. Initiate the Emergency Hotfix procedure. |
| **Users report content is not updating** | • New content was not published in Strapi. • Caching issue. | 1\. Log in to the Strapi admin panel and verify that the content is in a "Published" state. 2\. Clear any server-side or CDN caches if applicable. |

####

###

### **6\. Access Credentials & Security** {#6.-access-credentials-&-security}

All access credentials, API keys, and sensitive configuration details are **NOT** stored in this document. They are securely managed in the company's password management system.

* **Password Manager:** Bitwarden, 1Password
* **Access Required:** To perform maintenance, personnel will need access to:
  * Cloud Provider Console (e.g., Digital Ocean)
  * Database Management Console (e.g., MongoDB Atlas)
  * Strapi Admin Panel
  *  Google Play Console

### **7\. Backup Procedures** {#7.-backup-procedures}

1) Connect VPN to company private server
2) Upload zip documents file to the server via command
3) scp \-r \~/folder/filename root@134.209.10x.1xx:/root

####

| Backup | Frequency | Storage | Owner |
| ----- | ----- | ----- | ----- |
| **Documents** | Everytime documents changed | Company’s server **134.209.10x.1xx** | [{{role_name}}]({{contact_email}}) |
| **Database** | Every hour | Company’s server **134.209.10x.1xx** | [{{role_name}}]({{contact_email}}) |
| **Repository** | 1 time /2 week | Company’s server **134.209.10x.1xx** | [{{role_name}}]({{contact_email}}) |

####

### **8\. Service Level Agreement (SLA)** {#8.-service-level-agreement-(sla)}

**Document Version:** 		1.0
**Date:** 				September  30, 2025
**Project Name:** 		{{project_name}}
**Project Durations**: 		March 28 \- {{date}}

This Service Level Agreement (SLA) is entered into between **{{client_name}}** ("Provider") and **Owner of {{client_name}}**("Customer") to define the level of service, support, and responsibilities for the  **"{{project_name}}**" software ("Software"). This agreement is intended to establish clear expectations and ensure a consistent and reliable service.

---

#### **8.1 Agreement Overview** {#8.1-agreement-overview}

This SLA outlines the parameters of all services covered as they are mutually understood by the primary stakeholders. This Agreement remains valid until superseded by a revised agreement mutually endorsed by both parties

| Parties Involve | Software Department |
| :---- | :---- |
| **Agreements Period** | September  30, 2025 \- September 30,  2026 |
| **Review Period** | This SLA will be reviewed every 12 months or as otherwise needed. |

###

#### **8.2 Scope of Services** {#8.2-scope-of-services}

The Provider will deliver the following services:

| Service | Description |
| ----- | ----- |
| **Software access and Availability** | The Provider grants the Customer access to {{project_name}}, astrological guides specialise for users. The software is guaranteed to be available and operational 95% of the time each calendar month, excluding scheduled maintenance. |
| **Technical Support** | Technical support is available to the Customer via email at **contact@sodalityco.th** and through our online ticketing portal at **ClickUp.**. Our support team is available from **9:00 AM to 5:00 PM, Monday-Friday.**. We commit to a one-hour response time for critical issues and a four-hour response time for all other inquiries during business hours. |
| **Data Backup and Recovery** | The Provider performs automated, daily backups of all customer data. These backups are encrypted and stored in a secure, off-site location for a period of 30 days. In the event of a data loss incident, we commit to a Recovery Time Objective (RTO) of 4 hours to restore service and a Recovery Point Objective (RPO) of 24 hours, minimizing any potential data loss |
| **Maintenance** | Scheduled maintenance will be performed to apply updates and security patches. These maintenance windows are scheduled outside of primary business hours, typically on **Saturdays between 10:00 PM and 2:00 AM**. The Customer will be notified via email at least 48 hours in advance of any planned maintenance. Emergency maintenance may be required at other times to address critical security vulnerabilities. |

#### **8.3 Roles and Responsibilities** {#8.3-roles-and-responsibilities}

* **Provider Responsibilities:**
  * Ensure the software meets the agreed-upon uptime guarantee.
  * Provide timely and effective technical support.
  * Perform regular maintenance and updates to the software.
  * Notify the Customer of any planned downtime in advance.
* **Customer Responsibilities:**
  * Use the software in accordance with the terms of service.
  * Provide the Provider with all necessary information to diagnose and resolve issues.Inform the Provider of any business requirement changes that may affect the SLA.

#### **8.4 Service Performance and Metrics** {#8.4-service-performance-and-metrics}

The following table details the priority levels, response times, and resolution times for support requests:

| Priority Level | Description | Response Time | Resolution Time |
| ----- | ----- | :---: | :---: |
| **P1 \- Critical** | System-wide outage, major business impact. | 15 Minutes | 4 Hours |
| **P2 \- High** | Significant business impact, a large group of users affected. | 1 Hour | 8 Hours |
| **P3 \- Medium** | Minor business impact, a small group of users affected. | 4 Hours | 24 Hours |
| **P4 \- Low** | No immediate business impact, individual user issue. | 8 Hours | 3 Business Days |

**Uptime Guarantee:** The Service Provider guarantees a 99.9% uptime for all critical systems, which equates to no more than 8.76 hours of downtime per year. Uptime is measured monthly.

{{author}}﻿				{{product_owner_name}}﻿
                     **Project Manager					      Product Owner**
        September  30, 2025				 	  September  30, 2025
