> **Template (WP08)** — Generated from completed project reference. Replace all `{{placeholders}}` and remove example rows before baseline. Do not copy Sodality-specific URLs or credentials into new projects.

***[Insert diagram or screenshot here]***

**{{project_name}}**

**Product Operation Guideline**

**Document Version: 1.0**  
**Author:** {{role_name}}  
**Approval Date:** 11 September 2025  
**Revision History**

| Version | Date | Description | Author | Status |
| :---: | ----- | ----- | ----- | ----- |
| 0.1 | {{date}} | Initial draft created. Included basic setup steps for the API (NestJS/Strapi) and Mobile Application (Flutter). | {{role_name}} | Draft & For Review |
| 1.0 | {{date}} | **Major Update:** Added section **1.3 Server Setup**,Verified that all setup steps for API and Mobile are correct and functional. Document is now considered the baseline for developer onboarding. | [{{role_name}}]({{contact_email}}) | Approved |

# 

# 

**Table of content**

[**1\. Development Setup	4**](#1.-development-setup)

[**1.1 API (Backend)	4**](#1.1-api-\(backend\))

[Technology Stack:	4](#technology-stack:)

[Repository Structure:	4](#repository-structure:)

[Prerequisite	2](#prerequisite)

[Setup Steps	2](#setup-steps)

[**1.2 Mobile Application	3**](#1.2-mobile-application)

[Technology Stack:	3](#technology-stack:-1)

[Repository Structure:	4](#repository-structure:-1)

[Prerequisite	4](#prerequisite-1)

[Setup Steps	4](#setup-steps-1)

[**1.3 Server Setup	5**](#1.3-server-setup)

[Setup nginx	5](#setup-nginx)

[Initialize Database	6](#initialize-database)

[PostgreSQL 16	6](#postgresql-16)

[MongoDB 7.0	6](#mongodb-7.0)

[Setup VPN	6](#setup-vpn)

[Setup Docker	7](#setup-docker)

[Setup Github	7](#setup-github)

# 

# 

### **1\. Development Setup** {#1.-development-setup}

This section provides a comprehensive guide for setting up the local development environment required to work on the "{{project_name}}" project. Following these steps will ensure that all developers have a consistent and functional setup.

#### **1.1 API (Backend)** {#1.1-api-(backend)}

This guide covers the setup for the backend services, which include the NestJS API and the Strapi CMS.

##### **Technology Stack:**  {#technology-stack:}

A list of the primary languages, frameworks, and databases used.

* Language: Node.js (v18.x)  
  * Framework:NestJS  
  * Database: PostgreSQL (v16)  
  * Cache: Redis  
  * Package Manager: npm

##### **Repository Structure:** {#repository-structure:}

* **/src:** 		Main application source code.  
  * **/config:** 	Environment and configuration files.  
  * **/scripts:** 	Helper scripts for database migration, etc.  
  * **/tests:** 	All automated tests (unit, integration)

##### 

##### **Prerequisite** {#prerequisite}

* **Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)**  
* **Node.js: v18.x or higher [Downloading and installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)**  
* **Docker and Docker Compose: For running databases and other services** [Install Docker Engine](https://docs.docker.com/engine/install/)  
* **An API Client: Postman or Insomnia for testing endpoints \-** [Install and update Postman](https://learning.postman.com/docs/getting-started/installation/installation-and-updates/)

##### **Setup Steps** {#setup-steps}

Follow these steps in order to get the project running on your local machine.

**Step 1: Clone the Repository**  
	Open your terminal and run the following command:

**$ git clone the-path-api.git**  
**$ the-path-api**

**Step 2: Install Dependencies**

**$ cd the-path-api**  
**$ cd code**  
**$ npm install**

**Step 3: Configure Environment Variables**  
	Copy the example environment file:

**$ cp .env.example .env.local**

\- Open the newly created **.env.local** file in your code editor.	  
	\- Update the variables with your local configuration. Default values for the local database are usually sufficient.

**$ cp .env.example .env.local**  
**$ NODE\_ENV=local**  
**$ PORT=9009**  
**$ DB\_HOST=localhost**  
**$ DB\_PORT=5432**  
**$ DB\_USER=your local**  
**$ DB\_PASSWORD=your local**  
**$ DB\_NAME=your local**

**Step 4: Run the Application**

**$ npm run start**

####  **1.2 Mobile Application** {#1.2-mobile-application}

##### **Technology Stack:**  {#technology-stack:-1}

A list of the primary languages, frameworks, and databases used.

* Language: Flutter (v3.27.1)  
  * Cache: Redis  
  * Local storage: Hive Local Storage  
  * Package Manager: fvm (flutter version manager)

##### **Repository Structure:** {#repository-structure:-1}

* /lib: Main application source code.  
  * /ios: Ios configuration etc.  
  * /andrioid: Android configuration etc.  
  * /tests: All automated tests (unit, integration)

##### **Prerequisite** {#prerequisite-1}

* Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)  
* FVM: v3.27.x or higher [https://fvm.app/documentation/getting-started/installation](https://fvm.app/documentation/getting-started/installation)  
* Docker and Docker Compose: For running databases and other services [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install/)  
* Android studio:  [https://developer.android.com/studio/install](https://developer.android.com/studio/install)  
* Xcode: (for apple developer only)

##### **Setup Steps** {#setup-steps-1}

Follow these steps in order to get the project running on your local machine.

**Step 1: Clone the Repository**

Open your terminal and run the following command:

**$ git clone the-path-app.git**

**Step 2: Install Dependencies (For all ios & android)**

**$ cd the-path-app**  
**$ cd code**

	**$ fvm flutter clean**  
**$ fvm flutter pub get**

	**Step 3: Additional install (for IOS only)**

**$ cd ios**   
**$ pod install \--repo-update**  
**$ cd ..**

	**Step 4: Run application**

**$ fvm flutter run \--flavor development**    
	**\--dart-define-from-file=./lib/config/cfg\_development.json  \-t**   
	**lib/main.dart \--no-enable-impeller**

#### **1.3 Server Setup** {#1.3-server-setup}

Go to server by using the following command

**$ ssh username@host**

##### **Setup nginx** {#setup-nginx}

It's often used for serving web content, as a reverse proxy, and a load balancer.

**$ sudo apt update**  
**$ sudo apt install nginx**

##### **Initialize Database** {#initialize-database}

###### **PostgreSQL 16** {#postgresql-16}

open-source object-relational database system known for its reliability and data integrity.

**$ sudo apt update**	  
**$ sudo apt install postgresql-16 postgresql-contrib-16**  
**$ sudo systemctl start postgresql**  
**$ sudo systemctl enable postgresql**  
**$ sudo nano /etc/postgresql/16/main/postgresql.conf**

###### 	**MongoDB 7.0** {#mongodb-7.0}

document-oriented NoSQL database program.

**$ sudo apt update**	  
**$ sudo apt install \-y mongodb-org**  
**$ sudo systemctl start mongod**  
**$ sudo systemctl enable mongod**

######  **Setup VPN** {#setup-vpn}

the installation process for Pritunl, an open-source VPN server.

**$ echo "deb [https://repo.pritunl.com/stable/apt](https://repo.pritunl.com/stable/apt) jammy main" |**   
		**sudo tee /etc/apt/sources.list.d/pritunl.list** 

**$ sudo apt update**   
	**$ sudo apt install \-y pritunl**  
	**$ sudo systemctl start pritunl**   
**$ sudo systemctl enable pritunlsudo pritunl set**   
		**app.redirect\_server false**

###### **Setup Docker** {#setup-docker}

the steps to install Docker, a platform for developing, shipping, and running applications in containers.

**$ sudo apt update**  
**$ sudo apt install apt-transport-https ca-certificates curl**   
		**software-properties-common**

**$  curl \-fsSL https://download.docker.com/linux/ubuntu/gpg |**   
		**Sudo gpg \--dearmor \-o**   
		**/usr/share/keyrings/docker-archive-keyring.gpg**

**$ echo "deb \[arch=$(dpkg \--print-architecture)**   
		**signed-by=/usr/share/keyrings/docker-archive-keyring.gpg\]**   
		**https://download.docker.com/linux/ubuntu $(lsb\_release \-cs)**   
		**stable" | sudo tee /etc/apt/sources.list.d/docker.list \>**   
		**/dev/null**  
**$ sudo apt update**  
**$ sudo apt-cache policy docker-ce**  
**$ sudo apt install docker-ce**

###### **Setup Github** {#setup-github}

**$ sudo apt update**	  
**$ sudo apt install git**  
**$ sudo apt install gh**
