# aws-tools

```shell script
aws-tools ec2 \
    run-command \
    --profile default \
    --region us-east-1 \
    --tag default-web \
    'ls -la'

aws-tools ec2 \
    run-script \
    --profile default \
    --region us-east-1 \
    --tag default-web \
    ~/Downloads/update_server.sh

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
