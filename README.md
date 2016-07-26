## Env vars
Create a `.env` file at the project root with the following values:
* `AWS_MASTER_KEY` which is an AWS KMS master key alias
* `AWS_FILENAME` The location of .aws/credentials on the machine
* `AWS_BUCKET_NAME` The name of the s3 bucket that the aws user has privileges to use

# Setup
* Create `.env`
* `npm install`

# Run
* `npm test`