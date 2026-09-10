> **Template (WP16)** — Generated from completed project reference. Replace all `{{placeholders}}` and remove example rows before baseline. Do not copy Sodality-specific URLs or credentials into new projects.

***[Insert diagram or screenshot here]***

**{{project_name}}**

**Software Design**

**Document Version: 1.0**
**Author:** [{{role_name}}]({{contact_email}})
     **Approval Date:** 10 April 2025
**Revision History**

| Version | Date | Description | Author | Status |
| :---: | :---: | ----- | ----- | :---: |
| 0.1 | {{date}} | Initial draft of the Software Design Document created | [{{role_name}}]({{contact_email}}) | Draft |
| 0.2 | {{date}} | Updated database schema designs for MongoDB and PostgreSQL. Added detailed sequence diagrams for Authentication and Chart Generation flows. | [{{role_name}}]({{contact_email}}) | For Review |
| 1.0 | {{date}} | Final version approved by [{{author}}]({{contact_email}}). Released for the Development Phase. | [{{author}}]({{contact_email}}) | Approved/ Baseline |

**Table of contents**

[**1\. Introduction	1**](#1.-introduction)

[1.1 Purpose	1](#1.1-purpose)

[1.2 Scope	1](#1.2-scope)

[**2\. System Overview	3**](#2.-system-overview)

[**3\. Design Consideration	3**](#3.-design-consideration)

[3.1 Assumptions and Dependencies	3](#3.1-assumptions-and-dependencies)

[3.2 Constraints	4](#3.2-constraints)

[3.3 Design Goals and Guidelines	5](#3.3-design-goals-and-guidelines)

[**4\. System Architecture	6**](#4.-system-architecture)

[4.1 Detailed Breakdown of Components	7](#4.1-detailed-breakdown-of-components)

[4.2 Application Tier (Backend Services)	7](#4.2-application-tier-\(backend-services\))

[4.3 Data Tier (Databases and Storage)	9](#4.3-data-tier-\(databases-and-storage\))

[**5\. Detailed Design	10**](#5.-detailed-design)

[5.1 Module/Class Design	10](#5.1-module/class-design)

[5.2 Sequence / Activity Diagrams	11](#5.2-sequence-/-activity-diagrams)

[**6\. User Interface Design	12**](#6.-user-interface-design)

[**7\. Deployment Design	12**](#7.-deployment-design)

###

### **1\. Introduction** {#1.-introduction}

#### **1.1 Purpose** {#1.1-purpose}

The software development design describe architecture and system design for **{{project_name}}**, an astrological application. **{{project_name}}** designs to help people to become confident with the path of life and decision making. This document is intended for project Managers, Software Engineers, and anyone else who will be involved in the implementation of the system.

#### **1.2 Scope** {#1.2-scope}

This documents describes the implementations details of **{{project_name}}** application(TP). The path will consist of five major components: **User & Setting, Your Daily Compass, Your Personal Map, Divine Message, and Guided Mediation.**

The documents also contain the diagram of how the deployment processed and system overview such as the UX/UI design.

	**1.3 Glossary (Definitions, Acronyms, Abbreviations)**

| Acronyms | Full form | Meaning |
| :---: | ----- | ----- |
| **API** | Application Programming Interface | The set of rules and protocols for building and interacting with software components. |
| **Auth** | Authentication | The process of verifying the identity of a user (via Google  or Guest mode). |
| **CI/CD** | Continuous Integration/Continuous Deployment | The automation of building, testing, and deploying code changes. |
| **CMS** | Content Management System | A software application used to create and manage digital content. In this project, **Strapi** is used as the CMS. |
| **Docker** |  | A platform for developing, shipping, and running applications in containers. |
| **Flutter:** |  | Google's UI toolkit for building natively compiled applications for mobile, web, and desktop from a single codebase. |
| **JWT** | JSON Web Token |  A compact, URL-safe means of representing claims to be transferred between two parties. Used for user authentication |
| **NestJS** |  |  A progressive Node.js framework for building efficient, reliable, and scalable server-side applications. |
| **Frontend** |  | The client-side part of the application that users interact with directly, built with Flutter. |
| **Backend** |  | The server-side part of the application, responsible for data processing, business logic (including astrological calculations), and database management. |
| **RTM** | Requirements Traceability Matrix | A document that links requirements to their corresponding design components and test cases. |
| **SOW** | Statement of Work | The agreement that defines the scope, deliverables, and requirements of the project |
| **UI/UX** | User Interface / User Experience | Design focused on the visual elements and the overall experience of the user interacting with the application. |

Reference**:** The software design is referenced to the business requirements mentioned in [13.{{company_code}}\_{{project_code}}\_RS\_v1.0]({{sheet_link}})

### **2\. System Overview** {#2.-system-overview}

This document outlines the architecture and technology for the path (the mobile astrological forecast) application. The system is designed as a modern client-server application to deliver personalized and accurate astrological insights to users on Android devices. The diagram shown (4)

The technology involved in implementation of the path application and its related service included Flutter framework, NestJS, Git, Github, and third party tools such as firebase storage for image hosting.

Reference**:** [5.{{company_code}}\_{{project_code}}\_IE\_v1.0]({{sheet_link}})

### **3\. Design Consideration** {#3.-design-consideration}

#### **3.1 Assumptions and Dependencies** {#3.1-assumptions-and-dependencies}

**Assumptions:**

* **Internet Connectivity:** The application assumes users will have a stable internet connection to fetch the latest astrological data, horoscopes, and personalized readings. Core features may have limited offline functionality.
* **User Provided Data:** The accuracy of the astrological forecasts is dependent on the user providing accurate birth date, time, and location information. The system assumes this data is entered correctly.
* **Platform Availability:** The application will be developed for and distributed through major mobile platforms,  the Google Play Store (Android).
* **User Interest:** We assume the target users have a pre-existing interest in astrology and understand basic concepts like zodiac signs.
* **Device Permissions:** The application assumes users will grant necessary permissions, such as notifications, to enable features like daily horoscope alerts.

**Dependencies:**

* **Astrological API:** The application is dependent on a reliable and accurate internal API to provide raw astronomical data (ephemeris) for calculating planetary positions.
* **Geolocation Services:** An external geolocation service (like Google Maps API or a similar service) is required to accurately determine the user's birth location for precise chart calculations.
* **Cloud Infrastructure:** The system depends on a cloud service provider (DigitalOcean) for backend hosting, database management, and user data storage.

#### **3.2 Constraints** {#3.2-constraints}

These are constraints that might happen during project implementation.

* **Budget:** The project must be completed within a defined budget, which impacts the scope of features, development resources, and marketing efforts.
* **Performance:** The application must be lightweight and responsive, ensuring fast load times and smooth animations. Complex astrological calculations must be optimized to avoid draining the device's battery or causing performance lags.
* **Security and Privacy Compliance:** The application must comply with data protection regulations such as GDPR and CCPA. All sensitive user data, especially birth information, must be encrypted and stored securely.
* **Platform Guidelines:** The design and functionality must adhere to the specific guidelines and policies set by the Google Play Store to ensure approval and visibility**.**
* **API Rate Limits:** The application's usage of third-party APIs (for data, maps, etc.) is subject to rate limits and potential costs, which must be managed to prevent service disruptions.
* **Cross-Platform Compatibility:** The app must provide a consistent and functional experience across a wide range of Android devices with varying screen sizes, resolutions, and hardware capabilities.

#### **3.3 Design Goals and Guidelines** {#3.3-design-goals-and-guidelines}

The main aims and design goals for the application are considering by below factors-

* **Scalability:** The backend architecture must be designed to handle a growing number of users and increasing data load without degradation in performance.
* **Maintainability:** The code should be well-documented, modular, and follow clean architecture principles to simplify future updates, bug fixes, and feature additions.
* **Modularity:** The application should be built with independent, reusable components (e.g., user authentication, chart calculation engine, content display) to allow for parallel development and easier maintenance.
* **User-Centric Design:** The primary goal is to create an intuitive, engaging, and personalized user experience. The interface should be clean, easy to navigate, and present complex astrological information in an understandable way.
* **Personalization:** The app should deliver a highly personalized experience, providing content and insights that are directly relevant to the user's unique birth chart and preferences.
* **Reliability and Accuracy:** The application must be reliable, with minimal downtime. The astrological calculations and interpretations must be accurate and consistent.
* **Aesthetic Appeal:** A modern, visually appealing, and calming design aesthetic should be used to create an enjoyable and trustworthy user experience that aligns with the mystical nature of the content.

### **4\. System Architecture** {#4.-system-architecture}

*[Insert diagram or screenshot here]*

**Diagram Link:** [The PATH](https://miro.com/app/board/uXjVJT2ksyc=/)

This diagram illustrates the system architecture for a modern, full-featured astrology platform. It follows a three-tier, service-oriented architecture, which is a standard and robust pattern for building scalable and maintainable applications.

#### **4.1 Detailed Breakdown of Components** {#4.1-detailed-breakdown-of-components}

**Client Tier**

* **User Interface (UI):** This represents the mobile app (Android) or web application. Its key responsibilities are:
  * To present data in a visually appealing and interactive way (e.g., displaying a birth chart, listing meditations).
  * To capture user input (e.g., login credentials, birth information, feedback forms).
  * To communicate with the Backend via secure API requests.
  * To handle media streaming directly (e.g., playing meditation audio from a URL provided by the backend).

#### **4.2 Application Tier (Backend Services)** {#4.2-application-tier-(backend-services)}

This tier is composed of several independent microservices, orchestrated by a central gateway.

* **API Gateway / Auth Middleware** (The Secure Front Door):
  * **Responsibility:** To act as the single entry point for all incoming requests from the client. It inspects every request to ensure it's valid and secure before passing it to the appropriate internal service.
  * **Key Function:** It enforces authentication. Any request for protected data (like a chart or meditation) *must* include a valid security token (JWT). If not, the gateway rejects the request immediately, protecting the backend services from unauthorized access.
* **User Service:**
  * **Responsibility:** To manage everything related to user identity.
  * **Key Functions:** Handles user registration, validates login credentials, issues security tokens upon successful login, and manages user profile information (e.g., name, email, saved birth data).
* The Prediction Engine:
  * **Responsibility:** This is the core engine for all personalized, guidance and self-discovery content.
  * Key Functions:
- Calculates user’s Personal Map and analyzes current positional data..
- Generates personalized guidance and insights.
- Dynamically creates the "Divine Message" for the user based on their specific chart and current planetary positions.
* **Content Service** (The Static Content Library):
  * **Responsibility:** To manage and serve all generic, non-personalized content that is the same for every user.
  * Key Functions:
- Provides text and images for onboarding screens for new users.
- Serves information for static pages like "About Us," "Contact," or FAQs.
- Provides the metadata for Guided Meditations—the list of available tracks, their descriptions, and the direct URL to the audio files.

* **Feedback Service** (The Communication Channel):
  * **Responsibility:** To collect and store all forms of user feedback.
  * **Key Functions:** Receives data from feedback forms, bug reports, or feature requests submitted by users and saves it for review by the administrative team.

#### **4.3 Data Tier (Databases and Storage)** {#4.3-data-tier-(databases-and-storage)}

This tier contains the specialized storage systems needed to support the backend services.

* **User Database:** Stores all user profile information, including securely hashed passwords. It is exclusively managed by the user service
* **Content Database:** Holds all the static content managed by the content service, such as onboarding text and meditation metadata.
* **Feedback Database:** A dedicated database for storing all user-submitted feedback, managed by the feedback service.
* **Media Storage (e.g., Firebase Storage):** This is not a traditional database but a cloud-based file storage service. It is optimized for storing and delivering large files like the audio for guided meditations. The client streams directly from here for maximum efficiency.


###

### **5\. Detailed Design** {#5.-detailed-design}

#### **5.1 Module/Class Design** {#5.1-module/class-design}

For mobile application we have the following diagram showing how each layer work,

1) **Presentation Layer:** This is the topmost layer and the only one the user directly interacts with. Its primary responsibility is to display data to the user and handle their input.
2) **Business Layer:** This is the core of the application. It contains all the business rules, logic, and workflows that are unique to your astrological application. This layer is completely independent of the UI and the data sources, meaning it doesn't know how the data is displayed or where it comes from.
3) **Data Layer:** This layer's sole responsibility is to manage the application's data, regardless of where it is stored. It abstracts the data sources from the Business Layer, which simply requests data without needing to know if it's coming from a local cache, a database, or a remote server.
4) **Common (Cross-Cutting Concerns):** These are foundational modules that provide functionality needed across all three layers. They are centralized to avoid code duplication and ensure consistency.
- **Security:** Handles everything related to security, such as user authentication (login/logout), authorization, data encryption, and secure storage of sensitive information like API keys.
- **Configuration:** Manages application-level settings and configurations that might change depending on the environment (development, production) or user settings.
- **Communication:** A low-level module that manages all network communication. It handles creating network requests, processing responses, managing connectivity issues, and error handling. The "Service tools" in the Data Layer would use this module to perform their tasks.

*[Insert diagram or screenshot here]*

#### **5.2 Sequence / Activity Diagrams** {#5.2-sequence-/-activity-diagrams}

The diagrams for each flow and service are designed and written in the Miro platform. The diagrams are separated for application and api.  Each diagram shows the flow of each service such as how the start of a user journey or functions till the complete process of workflow. [The PATH](https://miro.com/app/board/uXjVJT2ksyc=/)

### **6\. User Interface Design** {#6.-user-interface-design}

The design of user journeys from the beginning till the end of each feature, describe how the application will proceed to different features with different actions made by the end-user.

**Wireframe & UX/UI Design Link:** [Figma](https://www.figma.com/design/cqVflBEsC1DNrvNd9JjFhI/The-PATH--UI-Reflows-?node-id=0-1&p=f&t=AAP9cMc2S93uWH2G-0)

### **7\. Deployment Design** {#7.-deployment-design}

The deployment to different environments has been processed by the tool name git and github combined together known as **Github Action Workflows.** The path application designs and uses github action as a tool for deployment. This is also known as **CI/CD Pipeline.**

***[Insert diagram or screenshot here]***
