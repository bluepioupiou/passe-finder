<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'school-form',
	'enableAjaxValidation'=>false,
)); ?>

	<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

	<?php echo $form->errorSummary($model); ?>
	<?php if (!$model->isNewRecord){ ?>
	<div class="row">
		<?php echo $form->labelEx($model,'userManager_id'); ?>
		<?php echo $form->dropDownList($model,'userManager_id', CHtml::listData(User::model()->findAll(array('order'=>'username ASC')), 'id', 'username')); ?>
		<?php echo $form->error($model,'userManager_id'); ?>
	</div>
	<?php } ?>
	<div class="row">
		<?php echo $form->labelEx($model,'name'); ?>
		<?php echo $form->textField($model,'name',array('size'=>60,'maxlength'=>100)); ?>
		<?php echo $form->error($model,'name'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'adress'); ?>
		<?php echo $form->textField($model,'adress',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'adress'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'postal_code'); ?>
		<?php echo $form->textField($model,'postal_code'); ?>
		<?php echo $form->error($model,'postal_code'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'city'); ?>
		<?php echo $form->textField($model,'city',array('size'=>60,'maxlength'=>100)); ?>
		<?php echo $form->error($model,'city'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'url'); ?>
		<?php echo $form->textField($model,'url',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'url'); ?>
	</div>	

	<div class="row">
		<?php echo $form->labelEx($model,'comment'); ?>
		<?php echo $form->textArea($model,'comment',array('size'=>100,'maxlength'=>300)); ?>
		<?php echo $form->error($model,'comment'); ?>
	</div>	
	
	<div class="row">
		<?php echo $form->labelEx($model,'private'); ?>
		<i>Si coché, les cours seront obligatoirement privés</i><br />
		<?php echo $form->checkBox($model,'private'); ?>
		<?php echo $form->error($model,'private'); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Créer' : 'Sauvegarder'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->