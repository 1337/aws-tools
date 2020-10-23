# aws-tools

## Install

1. [Be using node 10+](https://github.com/nvm-sh/nvm)
1. `npm install -g 1337/aws-tools`

## Update

1. `npm uninstall -g aws-tools`
1. Install it again

## DIY Update

1. `git clone` this repo
1. [Be using node 10+](https://github.com/nvm-sh/nvm)
1. `npm link`

## Usage

```shell script
# Run a command on all instances matching a tag
aws-tools ec2 \
    run-command \
    --profile default \
    --region us-east-1 \
    --tag default-web \
    'ls -la'

# Run a script (from /tmp) on all instances matching a tag
aws-tools ec2 \
    run-script \
    --profile default \
    --region us-east-1 \
    --tag default-web \
    ~/Downloads/update_server.sh

# SSH into any instance matching a tag
aws-tools ec2 \
    ssh-any \
    --profile default \
    --region us-east-1 \
    --tag default-web

# SSH into an instance by its ID
# (You won't need my help SSHing into an instance by IP. Just use ssh.)
aws-tools ec2 \
    ssh \
    --instance-id i-0123456789abcdef0

aws-tools ec2 \
    log-files \
    --profile default \
    --region us-east-1 \
    --tag default-web \
    --log-file /var/log/apache/access.log

aws-tools rds \
    slowest-queries \
    --profile prod \
    --region us-east-1 \
    --instance-id \
    my-database-1
```
