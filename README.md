# LambdaEc2AutoStartStop

LambdaEc2AutoStartStop is an AWS Lambda function that automatically starts and stops EC2 instances based on tags. This helps to reduce costs by ensuring that EC2 instances are only running when needed.

[![CircleCI](https://circleci.com/gh/anhtaka/LambdaEc2AutoStartStop/tree/master.svg?style=svg)](https://circleci.com/gh/anhtaka/LambdaEc2AutoStartStop/tree/master)

## Features

- **Automatic Start/Stop**: Starts or stops EC2 instances based on predefined tags.
- **Tag-Based Management**: EC2 instances are managed based on tags (`AutoStart` and `AutoStop`) that define the start and stop times.
- **Cost Optimization**: Helps optimize AWS costs by ensuring instances run only when required.


## Prerequisites

Before setting up the Lambda function, ensure the following:

- **AWS Account**: You need an AWS account with sufficient permissions to manage EC2 instances and Lambda functions.
- **Node.js**: This function is written in JavaScript (Node.js), so Node.js should be installed on your local machine for development.

## Setup and Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/anhtaka/LambdaEc2AutoStartStop.git
cd LambdaEc2AutoStartStop
```
### 2. Install Dependencies
```bash
npm install
```
 or npm update
```bash
zip -rq UPFILE_NAME.zip node_modules/ app.js
```
### 3. AWS IAM Role Setup
Ensure your Lambda function has an IAM role with the following permissions:

- **ec2:DescribeInstances**
- **ec2:StartInstances**
- **ec2:StopInstances**


### 4. the Lambda Function setting
- 1.You can deploy the Lambda function using the AWS Management Console or AWS CLI. select node.js
 
- 2.Environment variables  key:holidaylist YYYY-MM-DD fomat(e.g.2024-07-15,2024-08-11)

- 3.upload to file(UPFILE_NAME.zip).

### 6.CloudWatch
For automated scheduling, set up a CloudWatch Event to trigger the Lambda function at your desired intervals.

0/10 Minutes

### 7. Configure Tags on EC2 Instances
Add the following tags to the EC2 instances you want to manage:

- **AutoStart**: Set the desired start time in HH:mm or 1 or 0 format (e.g., 07:00).
- **AutoStartDueDate**: Activation valid until the specified date; if blank, activation disabled in  YYYYYMMDD 	format(e.g., 20240725).
- **AutoStop**: Set the desired stop time in HH:mm or 1 or 0  format (e.g., 19:00).
- **DayOffBoot**: start server on weekends and holidays in 1:Enabled 0:Disabled format(e.g., 0 or 1)


- **e.g.**

| Instance ID   | AutoStart | AutoStartDueDate | AutoStop | DayOffBoot |
| ------------- | --------- | ---------------- | -------- | ---------- |
| i-XXXXXXXXXX  | 0         |                  | 1        | 0  |
| i-XXXXXXXXXX  | 1         | 20241231         | 1        | 0 |
| i-XXXXXXXXXX  | 1         | 20241231         | 0        | 1 |

The Lambda function will start or stop instances based on these tag values

# Contributing
Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

# License
This project is licensed under the MIT License. See the LICENSE file for details.

# Reference rhinoceros (Diceros bicornis)
http://qiita.com/toshihirock/items/83c15c35562bed170fe4#%E7%B5%90%E8%AB%96

-------------------------------------

# Other
## For Docker
```cmd
docker-compose up
```
```cmd
docker-compose run app npm install
```
```cmd
docker-compose run app zip -rq UPFILE_NAME.zip node_modules/ app.js
```


