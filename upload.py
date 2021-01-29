#/usr/bin/python3
import logging
import subprocess

def run():
    print('Uploading your program to the MachineMotion...')
    subprocess.run(['scp', '-r', '.', 'debian@192.168.7.2:/var/lib/cloud9/mm-applications/app_template'])
    print('Uploading complete.')


if __name__ == "__main__":
    run()