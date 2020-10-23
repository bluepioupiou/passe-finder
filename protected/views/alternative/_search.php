<div class="wide form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'action'=>Yii::app()->createUrl($this->route),
	'method'=>'get',
)); ?>

	<div class="row">
		<?php echo $form->label($model,'id'); ?>
		<?php echo $form->textField($model,'id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'positionStart_id'); ?>
		<?php echo $form->textField($model,'positionStart_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'positionAlternative_id'); ?>
		<?php echo $form->textField($model,'positionAlternative_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'description'); ?>
		<?php echo $form->textField($model,'description',array('size'=>60,'maxlength'=>250)); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'dateCreate'); ?>
		<?php echo $form->textField($model,'dateCreate'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'dateMaj'); ?>
		<?php echo $form->textField($model,'dateMaj'); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton('Search'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- search-form -->